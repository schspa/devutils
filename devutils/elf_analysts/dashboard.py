"""Instantiate a Dash app."""
import numpy as np
import pandas as pd
import dash
import dash_table
import dash_html_components as html
import dash_core_components as dcc
from dash.dependencies import Input, Output, State
from .layout import html_layout

import os
import datetime
import tempfile
import base64
import io
from .elf_size_analyze import get_figures

def parse_contents(contents, filename, date):
    content_type, content_string = contents.split(',')

    decoded = base64.b64decode(content_string)
    fd, path = tempfile.mkstemp()
    try:
        with os.fdopen(fd, 'wb') as tmp:
            # do stuff with temp file
            tmp.write(decoded)
            print(path)
            figs = get_figures(path)
            graphs = []
            for fig in figs:
                graphs.append(dcc.Graph(figure=fig))
            return html.Div([
                html.H5(filename),
                html.H6(datetime.datetime.fromtimestamp(date)),
                html.Div(graphs),

                html.Hr(),  # horizontal line
            ])
    finally:
        os.remove(path)

    return html.Div([
        html.H5(filename),
        html.H6(datetime.datetime.fromtimestamp(date)),

        html.Hr(),  # horizontal line
    ])

def init_elf_analysts(server):
    """Create a Plotly Dash dashboard."""
    dash_app = dash.Dash(
        server=server,
        routes_pathname_prefix='/elf_size_analyse/',
        external_stylesheets=[
            '/static/dist/css/styles.css',
            'https://fonts.googleapis.com/css?family=Lato'
        ]
    )

    # Custom HTML layout
    dash_app.index_string = html_layout

    # Create Layout
    dash_app.layout = html.Div([
        dcc.Upload(
        id='upload-image',
        children=html.Div([
            'Drag and Drop or ',
            html.A('Select Files')
        ]),
        style={
            'width': '100%',
            'height': '60px',
            'lineHeight': '60px',
            'borderWidth': '1px',
            'borderStyle': 'dashed',
            'borderRadius': '5px',
            'textAlign': 'center',
            'margin': '10px'
        },
        # Allow multiple files to be uploaded
        multiple=True
    ),
    html.Div(id='output-image-upload'),
        ],
    )
    @dash_app.callback(Output('output-image-upload', 'children'),
              [Input('upload-image', 'contents')],
              [State('upload-image', 'filename'),
               State('upload-image', 'last_modified')])
    def update_output(list_of_contents, list_of_names, list_of_dates):
        children = []
        if list_of_contents is not None:
            figss = [parse_contents(c, n, d) for c, n, d in
                     zip(list_of_contents, list_of_names, list_of_dates)]
            return figss
        return children

    return dash_app.server
