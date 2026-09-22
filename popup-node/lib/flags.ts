// 로컬은 테스트 입구가 켜져 있다. Vercel에서는 실제 사람만 보인다.
// 라이브에서 A/B를 보려면 ENABLE_TEST_AGENTS=true.
export function testAgentsEnabled() {
  const flag = process.env.ENABLE_TEST_AGENTS;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return !process.env.VERCEL;
}
