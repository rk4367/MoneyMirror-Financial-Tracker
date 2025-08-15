from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import pdfplumber
import tempfile
import os
import logging
from datetime import datetime
from werkzeug.exceptions import HTTPException
import warnings
import re
from functools import wraps
import time
import hashlib
import secrets
import json

# Suppress specific Flask development warnings
warnings.filterwarnings("ignore", message="This is a development server")
warnings.filterwarnings("ignore", message="Debugger is active")

# Configure enhanced logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=['http://localhost:8080', 'http://localhost:8081', 'http://127.0.0.1:8080', 'http://127.0.0.1:8081'])

# Enhanced Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['PROPAGATE_EXCEPTIONS'] = True
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', secrets.token_hex(32))

# Security: Rate limiting storage with enhanced tracking
request_times = {}
request_counts = {}
blacklisted_ips = set()

def is_ip_blacklisted(ip):
    """Check if IP is blacklisted"""
    return ip in blacklisted_ips

def blacklist_ip(ip, duration=3600):
    """Blacklist an IP for specified duration (default 1 hour)"""
    blacklisted_ips.add(ip)
    # In production, this would be stored in Redis or database
    logger.warning(f"IP {ip} has been blacklisted for {duration} seconds")

def rate_limit(max_requests=10, window=60, strict=False):
    """Enhanced rate limiting decorator with IP blacklisting"""
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            client_ip = request.remote_addr
            
            # Check if IP is blacklisted
            if is_ip_blacklisted(client_ip):
                return jsonify({'error': 'Access denied. IP is blacklisted.'}), 403
            
            current_time = time.time()
            
            # Clean old entries
            request_times[client_ip] = [t for t in request_times.get(client_ip, []) 
                                      if current_time - t < window]
            
            # Track request count
            request_count = len(request_times.get(client_ip, []))
            
            if request_count >= max_requests:
                if strict:
                    blacklist_ip(client_ip)
                    logger.warning(f"IP {client_ip} blacklisted due to rate limit violation")
                    return jsonify({'error': 'Access denied due to rate limit violations.'}), 403
                else:
                    return jsonify({'error': 'Rate limit exceeded. Please try again later.'}), 429
            
            request_times.setdefault(client_ip, []).append(current_time)
            return f(*args, **kwargs)
        return wrapped
    return decorator

def validate_filename(filename):
    """Enhanced filename validation for security"""
    if not filename:
        return False
    
    # Check for path traversal attempts
    if '..' in filename or '/' in filename or '\\' in filename:
        return False
    
    # Check for dangerous file extensions
    dangerous_extensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.php', '.asp', '.aspx', '.jsp']
    if any(filename.lower().endswith(ext) for ext in dangerous_extensions):
        return False
    
    # Check filename length
    if len(filename) > 255:
        return False
    
    # Check for suspicious patterns
    suspicious_patterns = [r'<script', r'javascript:', r'vbscript:', r'onload=', r'onerror=']
    for pattern in suspicious_patterns:
        if re.search(pattern, filename, re.IGNORECASE):
            return False
    
    return True

def validate_file_content(file_path):
    """Validate file content for security"""
    try:
        # Check file size
        file_size = os.path.getsize(file_path)
        if file_size > 16 * 1024 * 1024:  # 16MB limit
            return False, "File too large"
        
        # Check file header for PDF
        with open(file_path, 'rb') as f:
            header = f.read(4)
            if header != b'%PDF':
                return False, "Invalid PDF file"
        
        return True, "Valid PDF file"
    except Exception as e:
        return False, f"File validation error: {str(e)}"

def sanitize_input(data):
    """Sanitize input data"""
    if isinstance(data, str):
        # Remove potentially dangerous characters
        data = re.sub(r'[<>"\']', '', data)
        # Limit length
        return data[:10000]
    elif isinstance(data, dict):
        return {k: sanitize_input(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_input(item) for item in data]
    return data

def add_security_headers(response):
    """Enhanced security headers"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self';"
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.after_request
def after_request(response):
    """Add security headers to all responses"""
    return add_security_headers(response)

@app.before_request
def before_request():
    """Pre-request security checks"""
    # Log request for security monitoring
    logger.info(f"Request: {request.method} {request.path} from {request.remote_addr}")
    
    # Check for suspicious headers
    suspicious_headers = ['x-forwarded-for', 'x-real-ip', 'x-forwarded-proto']
    for header in suspicious_headers:
        if header in request.headers:
            logger.warning(f"Suspicious header detected: {header}")

@app.route('/api/parse-pdf', methods=['POST'])
@rate_limit(max_requests=5, window=60, strict=True)  # 5 requests per minute with strict enforcement
def parse_pdf():
    """Parse PDF bank statements and extract transaction data with enhanced security"""
    try:
        # Validate request
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Enhanced filename validation
        if not validate_filename(file.filename):
            logger.warning(f"Invalid filename attempted: {file.filename} from {request.remote_addr}")
            return jsonify({'error': 'Invalid filename'}), 400
        
        if not file.filename or not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Only PDF files are supported'}), 400

        logger.info(f"Processing PDF file: {file.filename} from {request.remote_addr}")
        
        # Secure temporary file creation
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf', dir='/tmp') as tmp:
            file.save(tmp)
            tmp_path = tmp.name

        # Validate file content
        is_valid, validation_message = validate_file_content(tmp_path)
        if not is_valid:
            os.remove(tmp_path)
            logger.warning(f"File validation failed: {validation_message} for {request.remote_addr}")
            return jsonify({'error': validation_message}), 400

        entries = []
        try:
            with pdfplumber.open(tmp_path) as pdf:
                logger.info(f"PDF has {len(pdf.pages)} pages")
                
                # Enhanced page limit check
                if len(pdf.pages) > 50:
                    os.remove(tmp_path)
                    return jsonify({'error': 'PDF too large. Maximum 50 pages allowed.'}), 400
                
                for page_num, page in enumerate(pdf.pages):
                    table = page.extract_table()
                    if not table or len(table) < 2:
                        logger.info(f"No table found on page {page_num + 1}, trying to extract text lines.")
                        # Try to extract lines of text and parse heuristically
                        lines = page.extract_text().split('\n') if page.extract_text() else []
                        for line in lines:
                            # Enhanced heuristic parsing with input sanitization
                            parts = [p.strip() for p in line.split('  ') if p.strip()]
                            if len(parts) >= 4:
                                date, description, amount, type_ = parts[:4]
                                try:
                                    amount_val = float(amount.replace(',', ''))
                                    # Validate amount range
                                    if amount_val > 999999999.99 or amount_val < -999999999.99:
                                        continue
                                except Exception:
                                    continue
                                if date and description and amount:
                                    # Sanitize data before adding
                                    sanitized_entry = {
                                        'date': sanitize_input(date),
                                        'description': sanitize_input(description),
                                        'amount': amount_val,
                                        'type': sanitize_input(type_)
                                    }
                                    entries.append(sanitized_entry)
                        continue  # Move to next page
                    
                    headers = [h.strip().lower() if h else "" for h in table[0]]
                    logger.info(f"Headers found: {headers}")
                    
                    for row in table[1:]:
                        if not row or len(row) != len(headers):
                            continue
                        row_dict = dict(zip(headers, row))
                        date = (row_dict.get('date') or '').strip()
                        description = (row_dict.get('narration') or row_dict.get('description') or '').strip()
                        withdrawal = (row_dict.get('withdrawal (dr)') or row_dict.get('withdrawal') or '0')
                        deposit = (row_dict.get('deposit (cr)') or row_dict.get('deposit') or '0')
                        try:
                            if withdrawal and withdrawal.strip() and float(withdrawal.replace(',', '')) > 0:
                                amount = float(withdrawal.replace(',', ''))
                                type_ = 'Debit'
                            elif deposit and deposit.strip() and float(deposit.replace(',', '')) > 0:
                                amount = float(deposit.replace(',', ''))
                                type_ = 'Credit'
                            else:
                                amount = 0
                                type_ = ''
                            
                            # Validate amount range
                            if amount > 999999999.99 or amount < -999999999.99:
                                continue
                                
                            if date and description and amount:
                                # Sanitize data before adding
                                sanitized_entry = {
                                    'date': sanitize_input(date),
                                    'description': sanitize_input(description),
                                    'amount': amount,
                                    'type': sanitize_input(type_)
                                }
                                entries.append(sanitized_entry)
                        except (ValueError, TypeError) as e:
                            logger.warning(f'Error parsing row on page {page_num+1}: {e}')
                            continue
                            
                if not entries:
                    return jsonify({'error': 'No valid entries found in PDF. Please check the format. The PDF may not contain a recognizable table or text-based data.'}), 400
                
                logger.info(f"Successfully extracted {len(entries)} entries")
                return jsonify({'entries': entries, 'count': len(entries)})
                
        except Exception as e:
            logger.error(f'PDF parsing error: {e}')
            return jsonify({'error': f'PDF parsing error: {str(e)}'}), 500
        finally:
            # Enhanced temporary file cleanup
            try:
                os.remove(tmp_path)
            except OSError as e:
                logger.error(f"Failed to remove temporary file {tmp_path}: {e}")
            
    except Exception as e:
        logger.error(f'Unexpected error: {e}')
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Enhanced health check endpoint"""
    try:
        # Basic system checks
        temp_dir_writable = os.access('/tmp', os.W_OK)
        memory_available = True  # In production, check actual memory
        
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'version': '1.0.0',
            'checks': {
                'temp_directory': temp_dir_writable,
                'memory_available': memory_available
            }
        }
        
        if not all(health_status['checks'].values()):
            health_status['status'] = 'degraded'
            return jsonify(health_status), 503
            
        return jsonify(health_status)
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 503

@app.errorhandler(Exception)
def handle_exception(e):
    """Enhanced exception handler"""
    # Pass through HTTP errors
    if isinstance(e, HTTPException):
        logger.warning(f"HTTP error {e.code}: {e}")
        return make_response(jsonify({'error': str(e)}), e.code)
    
    # Log unexpected exceptions
    logger.error(f'Unhandled exception: {e}', exc_info=True)
    
    # Return generic error message in production
    if os.environ.get('FLASK_ENV') == 'production':
        return jsonify({'error': 'Internal server error'}), 500
    else:
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(e):
    """Enhanced 404 handler"""
    logger.warning(f"404 error: {request.path} from {request.remote_addr}")
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(413)
def too_large(e):
    """Handle file too large errors"""
    logger.warning(f"File too large: {request.remote_addr}")
    return jsonify({'error': 'File too large. Maximum size is 16MB.'}), 413

if __name__ == '__main__':
    port = int(os.environ.get('BACKEND_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    
    # Enhanced production security
    if os.environ.get('FLASK_ENV') == 'production':
        debug = False
        # Additional production security measures
        app.config['SESSION_COOKIE_SECURE'] = True
        app.config['SESSION_COOKIE_HTTPONLY'] = True
        app.config['SESSION_COOKIE_SAMESITE'] = 'Strict'
    
    logger.info(f"Starting Flask app on port {port} with debug={debug}")
    app.run(debug=debug, host='0.0.0.0', port=port)