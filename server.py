# server.py
# x402-Alipay Demo -- FastAPI server

import os
import sys
import json
import time
import uuid
from typing import Optional

# Windows GBK terminal compatibility
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import uvicorn
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.responses import HTMLResponse
from dotenv import load_dotenv

from payment_backends.base import PaymentProof
from payment_backends.alipay import AlipayBackend
from payment_backends.demo import DemoBackend

load_dotenv()

# ---------- config ----------
PAYMENT_AMOUNT = os.getenv("PAYMENT_AMOUNT", "0.01")
SERVER_ALIPAY_ACCOUNT = os.getenv("SERVER_ALIPAY_ACCOUNT", "")

# ---------- pick backend ----------
ALIPAY_APP_ID = os.getenv("ALIPAY_APP_ID", "2021006168648698")
ALIPAY_DEFAULT_PRIVATE_KEY = "MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCVUjkXd0fN24vikbWNQDEGtQXrI11yyUZ8M0Q4jRMuD+H26LKIXQJGJPvJe1LgLV1qXv74K0RT9dQrnOZW5suYPrD64Z7Xe1q7EKukhsWXa1olXIQYsdc1SFcN5HR2CdEyK6dnbLKKyyrpUi8m0zA3sqENcfPh/R6dWpgQxkvjg+VPtUzIfTntxMCNuMowTYDf82MmhkOPQHn8Oobn5q+FPXhtQ2hfftiAVk68PlRsFcgq0x875LxPyT3eibUSpxffXViYaLnFbvz5my6pcX/36ZZNIPnTkLxKuMuTovoClXaZDpJ4iBm/5fCOyldVK9G9yhjWKj28xJw8yaUjtjgpAgMBAAECggEATfTSV5zvgNrZCh12Qls7/Ttu7pbVB8NrKBZ/zGJinA6wsv5Djwu3zzUpusPGvcERXyJfTOMR1h+meGp+mun9aut37FL0YZ1F/hmy8r9l0yq5sn29fUMDjw7IXDlkT+fKLr45tLY79FgjfBJrCYMCTmHU0Tcn01kZrZ8JeuB76Dg8UVpXoQhDKcqYpoTErXFozN/IxcgmkKlcGZWaksIszCfeOiN9jhP7eEpj3PavVMCh4Ch/zYlsOOolUs6f4SP03P0MolP4mHsIlGsyicrUODKIFz0lNb6PH5xx20wZOMPd6Ibiz3t/RuVxuu1aweGHfuXQNWp1smbciL+JbioegQKBgQDRh1iGB1bK++Sc9lNUuO0sw7X/c0suVQbpZ69QdwgA7tHsou/1ErL2yA0CFt93xIDeIl/Y/GE+D5DIDocl3XWbdU87cp896Hc646oPQbg+ZrJJI4Exi0y2MxccjOm9lX4HzhafW4J0N6q6NI8wHK/Z7FgHJFlqYKOWGF/92O4ikQKBgQC2cGfIXimr8itNBsG6BAYsyEOK2YZV1Ev64PuusMLpaMv49EAS9MuhdikcOgc8o6Gk3rwa/mruZcNRlaZnnUFsPvGltUJdfWyXNbwoP8Q5i9aX19fR5cm+rpBOiBT4XM1mXXRhxVZIccWp8rcxnIw1d6pi1hOSlLZBQt8uUuNYGQKBgGmnnRzgoIR0pl/72iNTqM001xY79gIj//s8PGwPyapmwtZXhzaGOlY0pFKUZBUJso3QuZI6GXLo+HHY2Y9fb8l3Sv/IGcJm8ZBxcrSEyDo3INm+nIv2GTWa56GO8OKXeljHNCMhStP9qgqBLF7vaEE0a2MWkjwRBQxPuD/R3qrxAoGAGdxxObvvWEppzO9qQr4TSgHRYTtYiY4gfx2pT6gK2R9b2px1ALrmqqqfRTsMj5H6de6E56as7cJLH6OBBSsLfRanFoBNOgdvfzfExkfTvvyNnNSh6UUThg4ksp0jq9kr3JjeyIU6p+ZIyMB5K3UvgtzFsGD8QUkHVNTv4hcp1vECgYAN3xW8rudJc1Dxm0KQJKu3Bo7LBnhdvqUWTOnf36wmIlpeO8/4sreZIC+OwgvpdAHEg/2xQnnV1rMSvie35ARtA1FF1+Ad2sBdYNOmebR4z4RzI+VbO1ej0Oio5fejy+rjGHoBsKKLeLLyb0pEM8RDdov0o8Uu9g=="
ALIPAY_DEFAULT_PUBLIC_KEY = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlVI5F3dHzduL4pG1jUAxBrUF6yNdcslGfDNEOI0TLg/h9uiyiF0CRiT7yXtS4C1dal7++CtEU/XUK5zmVubLmD6w+uGe13tauxCrpIbFl2taJVyEGLHXNUhXDeR0dgnRMiunZ2yyissq6VIvJtMwN7KhDXHz4f0enVqYEMZL44PlT7VMyH057cTAjbjKME2A3/NjJoZDj0B5/DqG5+avhT14bUNoX37YgFZOvD5UbBXIKtMfO+S8T8k93om1EqcX311YmGi5xW78+ZsuqXF/9+mWTSD505C8SrjLk6L6ApV2mQ6SeIgZv+XwjspXVSvRvcoY1io9vMScPMmlI7Y4KQIDAQAB"
ALIPAY_APP_PRIVATE_KEY = os.getenv("ALIPAY_APP_PRIVATE_KEY", ALIPAY_DEFAULT_PRIVATE_KEY)
ALIPAY_PUBLIC_KEY = os.getenv("ALIPAY_PUBLIC_KEY", ALIPAY_DEFAULT_PUBLIC_KEY)

if ALIPAY_APP_ID and ALIPAY_APP_PRIVATE_KEY and ALIPAY_PUBLIC_KEY:
    # real alipay sandbox mode
    import asyncio  # noqa: F401
    backend = AlipayBackend(
        app_id=ALIPAY_APP_ID,
        app_private_key=ALIPAY_APP_PRIVATE_KEY,
        alipay_public_key=ALIPAY_PUBLIC_KEY,
        gateway_url=os.getenv(
            "ALIPAY_GATEWAY",
            "https://openapi-sandbox.dl.alipaydev.com/gateway.do",
        ),
        notify_url=None,
    )
    PAY_MODE = "real"
    print("  backend: Alipay sandbox")
else:
    backend = DemoBackend()
    PAY_MODE = "demo"
    print("  backend: demo (virtual payment)")

# ---------- in-memory store ----------
paid_orders: set = set()
pending_orders: dict = {}

# ---------- FastAPI app ----------
app = FastAPI(title="x402-Alipay Demo")


@app.get("/")
async def root():
    resp = {
        "message": "x402-Alipay Demo",
        "version": "1.0",
        "pay_mode": PAY_MODE,
        "endpoints": {
            "GET /api/data": "protected data (requires payment)",
            "GET /pay/{trade_no}": "payment page",
        },
    }
    if PAY_MODE == "demo":
        resp["demo_endpoints"] = {
            "GET /pay/demo/{trade_no}": "simulate payment (demo mode only)"
        }
    return resp


@app.get("/api/data")
async def get_data(request: Request):
    """
    Protected data endpoint.
    No payment -> 402 + pay url
    Paid -> return data
    """
    trade_no = request.headers.get("x402-trade-no", "")

    if trade_no:
        if trade_no in paid_orders:
            return {"message": "protected data", "value": 42, "trade_no": trade_no}

        proof = PaymentProof(
            tx_hash=trade_no,
            amount=PAYMENT_AMOUNT,
            sender="",
            recipient=SERVER_ALIPAY_ACCOUNT,
        )
        try:
            valid = await backend.verify_payment(
                proof, PAYMENT_AMOUNT, SERVER_ALIPAY_ACCOUNT
            )
            if valid:
                paid_orders.add(trade_no)
                return {"message": "protected data", "value": 42, "trade_no": trade_no}
        except Exception:
            pass

    # not paid -> 402
    order_info = None
    trade_no = f"x402_{int(time.time())}_{uuid.uuid4().hex[:8]}"

    if PAY_MODE == "real":
        order_info = await backend.create_trade_page_pay(
            amount=PAYMENT_AMOUNT,
            subject="API data fee (sandbox test)",
        )
        pay_url = order_info["pay_url"]
    else:
        pay_url = f"/pay/{trade_no}"

    pending_orders[trade_no] = {
        "amount": PAYMENT_AMOUNT,
        "created_at": time.time(),
    }

    return Response(
        status_code=402,
        content=json.dumps({
            "error": "payment_required",
            "message": f"Payment {PAYMENT_AMOUNT} CNY required to access this resource",
            "trade_no": trade_no,
            "amount": PAYMENT_AMOUNT,
            "pay_url": pay_url,
        }),
        media_type="application/json",
        headers={
            "x402-amount": PAYMENT_AMOUNT,
            "x402-trade-no": trade_no,
            "x402-pay-url": pay_url,
            "x402-method": PAY_MODE,
        },
    )


@app.get("/pay/{trade_no}", response_class=HTMLResponse)
async def pay_page(trade_no: str):
    """Payment page"""
    if trade_no not in pending_orders:
        return HTMLResponse(
            content="<h3 style='font-family:sans-serif;text-align:center;margin-top:100px;color:#999;'>Order paid or not found</h3>",
            status_code=404,
        )

    order = pending_orders[trade_no]

    if PAY_MODE == "real":
        order_info = await backend.create_trade_page_pay(
            amount=order["amount"],
            subject="API data fee (sandbox test)",
        )
        pay_url = order_info["pay_url"]
        pay_button = f'<a class="pay-btn" href="{pay_url}" target="_blank">Alipay Pay</a>'
        pay_tip = "Use Alipay sandbox app to scan QR code or login to pay"
    else:
        pay_button = f'<a class="pay-btn" href="/pay/demo/{trade_no}">Simulate Payment (Demo)</a>'
        pay_tip = "Demo mode - click button to simulate payment, no real money needed"

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>x402 Payment - {trade_no[:16]}...</title>
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 500px; margin: 60px auto; text-align: center; padding: 0 20px; }}
h1 {{ font-size: 28px; margin-bottom: 8px; }}
.subtitle {{ color: #666; margin-bottom: 30px; }}
.card {{ background: #f5f5f5; border-radius: 12px; padding: 30px; margin: 20px 0; }}
.price {{ font-size: 48px; font-weight: bold; color: #1677ff; }}
.price-label {{ font-size: 14px; color: #999; margin-top: 4px; }}
.order-id {{ font-size: 12px; color: #ccc; margin-top: 20px; }}
.pay-btn {{ display: inline-block; margin-top: 20px; padding: 16px 40px; background: #1677ff; color: #fff; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: 500; }}
.pay-btn:hover {{ background: #4096ff; }}
.tip {{ color: #999; font-size: 13px; margin-top: 16px; }}
.back {{ display: inline-block; margin-top: 30px; color: #1677ff; text-decoration: none; font-size: 14px; }}
</style>
</head>
<body>
<h1>x402 Micropayment</h1>
<p class="subtitle">Pay per use</p>
<div class="card">
<div class="price">{order['amount']} CNY</div>
<div class="price-label">API data access</div>
{pay_button}
</div>
<p class="tip">{pay_tip}</p>
<p class="order-id">Order: {trade_no}</p>
<a class="back" href="/">Back</a>
</body>
</html>"""
    return HTMLResponse(content=html)


# ---- demo-only endpoints ----

@app.get("/pay/demo/{trade_no}")
async def demo_pay(trade_no: str):
    """Simulate successful payment (demo mode only)"""
    if PAY_MODE != "demo":
        raise HTTPException(status_code=404, detail="not found in demo mode")

    if trade_no not in pending_orders:
        return HTMLResponse(
            content="<h3 style='font-family:sans-serif;text-align:center;margin-top:100px;'>Order paid or not found</h3>",
            status_code=200,
        )

    backend.simulate_pay(trade_no)
    paid_orders.add(trade_no)
    del pending_orders[trade_no]

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Payment Success - x402 Demo</title>
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 500px; margin: 60px auto; text-align: center; padding: 0 20px; }}
h1 {{ font-size: 28px; color: #52c41a; }}
.card {{ background: #f6ffed; border: 1px solid #b7eb8f; border-radius: 12px; padding: 30px; margin: 20px 0; }}
.code {{ background: #f0f0f0; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; word-break: break-all; }}
.btn {{ display: inline-block; margin-top: 20px; padding: 12px 30px; background: #1677ff; color: #fff; text-decoration: none; border-radius: 8px; }}
.tip {{ color: #999; font-size: 13px; margin-top: 16px; }}
</style>
</head>
<body>
<h1>Payment Successful!</h1>
<div class="card">
<p>Order <code>{trade_no[:24]}...</code> completed</p>
<p>You can now access the protected data</p>
</div>
<p class="tip">Test with curl:</p>
<div class="code">curl -H "x402-trade-no: {trade_no}" http://localhost:8000/api/data</div>
<br>
<a class="btn" href="/api/data" onclick="doFetch(event)">Fetch Data Now</a>
<script>
function doFetch(e) {{
e.preventDefault();
fetch('/api/data', {{ headers: {{ 'x402-trade-no': '{trade_no}' }} }})
.then(r => r.json()).then(d => alert(JSON.stringify(d, null, 2)));
}}
</script>
<p class="tip" style="margin-top:30px;"><a href="/" style="color:#1677ff;">Back</a></p>
</body>
</html>"""
    return HTMLResponse(content=html)


# ---- order status ----

@app.get("/orders/{trade_no}/status")
async def order_status(trade_no: str):
    """Check order status"""
    if trade_no in paid_orders:
        return {"trade_no": trade_no, "status": "paid"}

    if PAY_MODE == "real":
        try:
            result = await backend.query_trade(trade_no)
            if result:
                status = result.get("trade_status", "")
                if status == "TRADE_SUCCESS":
                    paid_orders.add(trade_no)
                    return {"trade_no": trade_no, "status": "paid"}
                return {"trade_no": trade_no, "status": status}
        except Exception:
            pass

    return {"trade_no": trade_no, "status": "pending"}


# ---------- start ----------
if __name__ == "__main__":
    port = int(os.getenv("PORT", "80"))
    print("=" * 50)
    print("  x402-Alipay Demo")
    print("  " + "-" * 46)
    print(f"  mode: {PAY_MODE}")
    print(f"  amount: {PAYMENT_AMOUNT} CNY")
    print(f"  port: {port}")
    print(f"  endpoints:")
    print(f"    http://localhost:{port}/api/data  (protected, needs payment)")
    print(f"    http://localhost:{port}           (docs)")
    print("=" * 50)

    uvicorn.run(app, host="0.0.0.0", port=port)
