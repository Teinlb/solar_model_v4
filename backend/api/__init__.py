"""API server initialization and configuration."""
from flask import Flask, send_file, jsonify
from flask_cors import CORS
from pathlib import Path

def create_app():
    """Create and configure the Flask application."""
    # Get absolute paths
    root_dir = Path(__file__).parent.parent.parent.resolve()
    static_folder = root_dir / 'frontend' / 'dist'
    
    app = Flask(__name__, static_folder=str(static_folder), static_url_path='')
    CORS(app)  # Enable CORS for all routes
    
    # Register routes
    from .routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Serve configuration JSON files
    @app.route('/parameters.json')
    def serve_parameters():
        params_file = root_dir / 'default_data' / 'parameters.json'
        return send_file(str(params_file.resolve()), mimetype='application/json')
    
    @app.route('/presets.json')
    def serve_presets():
        presets_file = root_dir / 'default_data' / 'presets.json'
        return send_file(str(presets_file.resolve()), mimetype='application/json')
    
    # Serve frontend
    @app.route('/')
    def serve_frontend():
        return send_file(str(static_folder / 'index.html'))
    
    @app.errorhandler(404)
    def not_found(e):
        # If file not found, try to serve index.html for SPA routing
        index_file = static_folder / 'index.html'
        if index_file.exists():
            return send_file(str(index_file.resolve()))
        return jsonify({'error': 'Not found'}), 404
    
    return app
