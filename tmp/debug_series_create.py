from app.modules.series import store_sqlite
import traceback
print('creating...')
try:
    r = store_sqlite.create({'project_id':'p_demo','name':'S1'})
    print('ok', r)
except Exception:
    traceback.print_exc()
