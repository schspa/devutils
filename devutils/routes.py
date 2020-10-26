"""Routes for parent Flask app."""
from flask import render_template
from flask import current_app as app

@app.route('/regutils/')
def regutils():
    """Landing page."""
    return render_template(
        'regutils.jinja2'
    )


@app.route('/')
def home():
    """Landing page."""
    return render_template(
        'index.jinja2',
        title='Development Utils',
        description='Utils for Software Development.',
        template='home-template',
        body="This is a homepage served with Flask."
    )
