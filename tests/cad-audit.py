"""Independent DXF validation. pip install ezdxf==1.4.3"""
import sys, json, math
from pathlib import Path
import ezdxf
from ezdxf.addons.drawing import RenderContext, Frontend, layout, svg

path = Path(sys.argv[1] if len(sys.argv)>1 else 'qa-evidence/practical/example.dxf')
doc = ezdxf.readfile(path)
audit = doc.audit()
assert not audit.errors and not audit.fixes, (audit.errors,audit.fixes)
assert doc.units == 4
msp = doc.modelspace()
outline = list(msp.query('LWPOLYLINE[layer=="OUTLINE"]'))[0]
assert outline.closed
points = list(outline.get_points('xy'))
assert max(p[0] for p in points)==36000
assert min(p[1] for p in points)==-24000
racks=list(msp.query('INSERT[layer=="RACK"]'))
assert racks
block=doc.blocks[racks[0].dxf.name]
points=list(next(iter(block.query('LWPOLYLINE'))).get_points('xy'))
assert math.isclose(max(p[0] for p in points)-min(p[0] for p in points),8000)
dims=list(msp.query('DIMENSION'))
assert dims and all(d.dxf.dimstyle=='WAREHOUSE_MM' for d in dims)
assert all(d.dxf.geometry in doc.blocks for d in dims)
backend=svg.SVGBackend()
Frontend(RenderContext(doc),backend).draw_layout(msp,finalize=True)
path.with_name('cad-view.svg').write_text(backend.get_string(layout.Page(420,297)),encoding='utf-8')
report={'parser':'ezdxf 1.4.3','units':'mm','warehouse':[36000,24000],'rackLocalWidth':8000,'rackRotation':racks[0].dxf.rotation,'dimensions':len(dims),'errors':0,'fixes':0,'viewer':'ezdxf SVG backend; AutoCAD/LibreCAD not tested'}
path.with_name('cad-audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
