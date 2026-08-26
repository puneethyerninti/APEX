import requests
import base64
import hmac
import hashlib
import time
import os
from dotenv import load_dotenv

load_dotenv('d:\\APEX\\apex-backend\\.env')

EKO_DEV_KEY = os.environ.get('EKO_DEV_KEY')
EKO_ACCESS_KEY = os.environ.get('EKO_ACCESS_KEY')
EKO_INITIATOR_ID = os.environ.get('EKO_INITIATOR_ID')

timestamp = str(int(time.time() * 1000))
key = base64.b64decode(EKO_ACCESS_KEY)
signature = base64.b64encode(hmac.new(key, timestamp.encode('utf-8'), hashlib.sha256).digest()).decode('utf-8')

headers = {
    'developer_key': EKO_DEV_KEY,
    'secret-key-timestamp': timestamp,
    'secret-key': signature,
    'Accept': 'application/json'
}

paths_to_try = [
    '/v3/tools/catalog/services-codes',
    '/tools/catalog/services-codes',
    '/v1/tools/catalog/services-codes',
    '/v2/tools/catalog/services-codes',
    '/v3/catalog/services-codes',
    '/catalog/services-codes',
    '/v3/tools/services-codes',
    '/tools/services-codes'
]

bases = [
    'https://api.eko.in:25002/ekoicici',
    'https://api.eko.in/ekoicici',
    'https://api.eko.in:25004/ekoicici',
    'https://api.eko.in:25002/ekoapi',
    'https://api.eko.in/ekoapi'
]

for base in bases:
    for path in paths_to_try:
        url = f"{base}{path}?initiator_id={EKO_INITIATOR_ID}"
        try:
            res = requests.get(url, headers=headers, timeout=3)
            print(f"[{res.status_code}] {url}")
            if res.status_code == 200:
                print("SUCCESS:", res.json())
        except Exception as e:
            pass
