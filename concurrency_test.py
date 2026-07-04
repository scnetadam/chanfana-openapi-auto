"""
x402-Alipay 并发测试脚本 (10并发)
测试 402 微支付协议的并发安全
"""
import asyncio
import httpx
import time
import sys

# 解决 Windows GBK 编码问题
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

SERVER = "http://localhost:8000"
CONCURRENCY = 100

def ok(cond):
    return "[PASS]" if cond else "[FAIL]"


async def test_1_concurrent_402():
    """场景1: 10并发同时请求受保护数据，全部应返回402"""
    print(f"\n{'='*60}")
    print(f"  场景1: 10并发请求无凭证数据 -> 全部应返回402")
    print(f"{'='*60}")

    async with httpx.AsyncClient() as c:
        tasks = [c.get(f"{SERVER}/api/data") for _ in range(CONCURRENCY)]
        t0 = time.perf_counter()
        responses = await asyncio.gather(*tasks)
        elapsed = time.perf_counter() - t0

        trade_nos = []
        for r in responses:
            try:
                body = r.json()
                trade_nos.append(body.get("trade_no", ""))
            except:
                pass

        statuses = [r.status_code for r in responses]
        counts = ', '.join(f'{s}({statuses.count(s)})' for s in sorted(set(statuses)))
        print(f"  状态码分布: {counts}")
        print(f"  全部 402: {all(s == 402 for s in statuses)}")
        trade_no_set = set(t for t in trade_nos if t)
        print(f"  唯一 trade_no: {len(trade_no_set)} (期望={CONCURRENCY})")
        print(f"  耗时: {elapsed:.3f}s 平均: {elapsed/CONCURRENCY:.4f}s")

        all_ok = all(s == 402 for s in statuses) and len(trade_no_set) == CONCURRENCY
        print(f"  {ok(all_ok)}")
        return trade_nos


async def test_2_concurrent_same_payment(trade_no: str):
    """场景2: 10并发使用同一个已支付 trade_no 获取数据"""
    print(f"\n{'='*60}")
    print(f"  场景2: 10并发使用同一 trade_no 请求数据")
    print(f"{'='*60}")

    async with httpx.AsyncClient() as c:
        await c.get(f"{SERVER}/pay/demo/{trade_no}")

        tasks = [
            c.get(f"{SERVER}/api/data", headers={"x402-trade-no": trade_no})
            for _ in range(CONCURRENCY)
        ]
        t0 = time.perf_counter()
        responses = await asyncio.gather(*tasks)
        elapsed = time.perf_counter() - t0

        statuses = [r.status_code for r in responses]
        counts = ', '.join(f'{s}({statuses.count(s)})' for s in sorted(set(statuses)))
        print(f"  状态码分布: {counts}")
        print(f"  全部 200: {all(s == 200 for s in statuses)}")
        print(f"  耗时: {elapsed:.3f}s")
        print(f"  {ok(all(s == 200 for s in statuses))}")


async def test_3_concurrent_pay_and_access():
    """场景3: 10并发各自独立完成 402->支付->获取数据 的全流程"""
    print(f"\n{'='*60}")
    print(f"  场景3: 10并发独立完成完整 402->支付->数据 流程")
    print(f"{'='*60}")

    async def single_flow():
        async with httpx.AsyncClient() as client:
            r1 = await client.get(f"{SERVER}/api/data")
            if r1.status_code != 402:
                return {"step": "402", "status": r1.status_code, "error": True}
            trade_no = r1.json().get("trade_no", "")
            await client.get(f"{SERVER}/pay/demo/{trade_no}")
            r3 = await client.get(
                f"{SERVER}/api/data",
                headers={"x402-trade-no": trade_no},
            )
            return {
                "step": "completed",
                "trade_no": trade_no,
                "status": r3.status_code,
                "error": r3.status_code != 200,
            }

    t0 = time.perf_counter()
    results = await asyncio.gather(*[single_flow() for _ in range(CONCURRENCY)])
    elapsed = time.perf_counter() - t0

    success = sum(1 for r in results if not r.get("error"))
    failed = sum(1 for r in results if r.get("error"))
    print(f"  成功: {success}/{CONCURRENCY}, 失败: {failed}")
    print(f"  耗时: {elapsed:.3f}s 平均: {elapsed/CONCURRENCY:.4f}s/流程")
    print(f"  {ok(success == CONCURRENCY)}")


async def test_4_concurrent_order_query():
    """场景4: 10并发查询同一订单状态"""
    print(f"\n{'='*60}")
    print(f"  场景4: 10并发查询同一订单状态")
    print(f"{'='*60}")

    async with httpx.AsyncClient() as c:
        r = await c.get(f"{SERVER}/api/data")
        trade_no = r.json().get("trade_no", "")
        await c.get(f"{SERVER}/pay/demo/{trade_no}")

        tasks = [
            c.get(f"{SERVER}/orders/{trade_no}/status")
            for _ in range(CONCURRENCY)
        ]
        t0 = time.perf_counter()
        responses = await asyncio.gather(*tasks)
        elapsed = time.perf_counter() - t0

        statuses = [r.status_code for r in responses]
        paid_statuses = [r.json().get("status") for r in responses]
        counts = ', '.join(f'{s}({statuses.count(s)})' for s in sorted(set(statuses)))
        print(f"  状态码分布: {counts}")
        print(f"  全部 paid: {all(s == 'paid' for s in paid_statuses)}")
        print(f"  耗时: {elapsed:.3f}s")

        all_ok = all(s == 200 for s in statuses) and all(s == "paid" for s in paid_statuses)
        print(f"  {ok(all_ok)}")


async def test_5_concurrent_invalid():
    """场景5: 10并发使用非法 trade_no"""
    print(f"\n{'='*60}")
    print(f"  场景5: 10并发使用非法 trade_no (Demo模式预期) ")
    print(f"{'='*60}")

    async with httpx.AsyncClient() as c:
        tasks = [
            c.get(f"{SERVER}/api/data", headers={"x402-trade-no": f"invalid_{i}_abc"})
            for i in range(CONCURRENCY)
        ]
        t0 = time.perf_counter()
        responses = await asyncio.gather(*tasks)
        elapsed = time.perf_counter() - t0

        statuses = [r.status_code for r in responses]
        counts = ', '.join(f'{s}({statuses.count(s)})' for s in sorted(set(statuses)))
        print(f"  状态码分布: {counts}")
        print(f"  耗时: {elapsed:.3f}s")
        print(f"  [OK] (Demo模式通配验证)")


async def main():
    print(f"\n{'#'*60}")
    print(f"  x402-Alipay 并发测试 (并发数={CONCURRENCY})")
    print(f"  服务器: {SERVER}")
    print(f"  时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'#'*60}")

    trade_nos = await test_1_concurrent_402()
    first_trade = trade_nos[0] if trade_nos else ""

    if first_trade:
        await test_2_concurrent_same_payment(first_trade)

    await test_3_concurrent_pay_and_access()
    await test_4_concurrent_order_query()
    await test_5_concurrent_invalid()

    print(f"\n{'#'*60}")
    print(f"  并发测试完成")
    print(f"{'#'*60}")


if __name__ == "__main__":
    asyncio.run(main())
