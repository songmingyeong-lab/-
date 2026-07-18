export function validateAreaCode(type: "administrative" | "legal", code: string) {
  const expectedLength = type === "administrative" ? 8 : 10;
  return new RegExp(`^\\d{${expectedLength}}$`).test(code);
}

export function assertAreaMatch(expectedCode: string, expectedName: string, actualCode: string, actualName: string) {
  if (expectedCode !== actualCode || expectedName !== actualName) {
    throw new Error(`지역 코드·명칭 불일치: expected ${expectedName}, actual ${actualName}`);
  }
}
