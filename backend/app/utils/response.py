from flask import jsonify

def success_response(data=None, message="Request successful", status_code=200):
    return jsonify({
        "success": True,
        "data": data,
        "message": message
    }), status_code

def error_response(code="INVALID_REQUEST", message="An error occurred", status_code=400):
    return jsonify({
        "success": False,
        "error": {
            "code": code,
            "message": message
        }
    }), status_code
