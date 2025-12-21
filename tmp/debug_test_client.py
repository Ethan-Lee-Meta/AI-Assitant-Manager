from fastapi.testclient import TestClient
from app.main import app
import traceback

c = TestClient(app)
try:
    r = c.post('/api/series', json={'project_id': 'p_demo', 'name': 'S1'})
    print('status', r.status_code)
    print('text', r.text)
    print('json', end=' ')
    try:
        print(r.json())
    except Exception:
        traceback.print_exc()
except Exception:
    traceback.print_exc()
