#!/usr/bin/env python3

import os
from pathlib import Path
from xml.dom import minidom
import os


def GenerateXML(filename, regtypes) :
    root = minidom.Document()


    xml = root.createElement('regtypes')
    root.appendChild(xml)
    for regtype in regtypes:
        regs_node = root.createElement('regtype')
        regs_node.setAttribute('type', regtype['type'])
        for reg in regtype['regs']:
            reg_node = root.createElement('reg')

            name_node = root.createElement('name')
            name_text=root.createTextNode(reg['name'])
            name_node.appendChild(name_text)
            reg_node.appendChild(name_node)

            path_node = root.createElement('path')
            path_text=root.createTextNode(reg['path'])
            path_node.appendChild(path_text)
            reg_node.appendChild(path_node)

            regs_node.appendChild(reg_node)
        xml.appendChild(regs_node)

    xml_str = root.toprettyxml(indent ="\t")

    with open(filename, "w") as f:
        f.write(xml_str)

asl_path = os.path.abspath(os.path.join(os.path.abspath(os.path.dirname(__file__)), '../static/arm-asl'))
static_path = os.path.abspath(os.path.join(os.path.abspath(os.path.dirname(__file__)), '../static'))

regtypes = [
    {'type': 'aarch64',
     'file': 'AArch64-regindex.xml'},
    {'type': 'aarch32',
     'file': 'AArch32-regindex.xml'},
]

allregs = []
for regtype in regtypes:
    regs = []
    reg_indexs = Path(asl_path).rglob(regtype['file'])

    for reg in reg_indexs:
        regs.append({'name': os.path.dirname(os.path.relpath(reg, asl_path)),
                 'path': os.path.relpath(reg, static_path)})
        pass
    allregs.append({'type': regtype['type'],
                    'regs': regs})

GenerateXML(os.path.join(asl_path, 'asl.xml'), allregs)
