from secretary import Renderer
import json, sys

engine = Renderer()
for line in sys.stdin:
  	ctx = json.loads(line)

template = 'template.odt'

result = engine.render(template, **ctx)

output = open(ctx.get('filepath'), 'wb')
output.write(result)

print json.dumps({'message': 'ok'})
