"""Routes for parent Flask app."""
import os
from flask import render_template, send_from_directory
from flask import current_app as app

def root_dir():  # pragma: no cover
    return os.path.abspath(os.path.dirname(__file__))

@app.route('/regutils/')
def regutils():
    """Landing page."""
    return render_template(
        'regutils.jinja2'
    )

@app.route('/aslshow/<asldir>/<aslfile>')
def aslshow(asldir, aslfile):
    """Landing page."""
    if aslfile.endswith("xml"):
        return render_template(
            'asl-view.jinja',
            asldir=str(asldir),
            aslfile=str(aslfile))
    else:
        return send_from_directory(root_dir() + "/static/arm-asl/" + asldir, aslfile)

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
