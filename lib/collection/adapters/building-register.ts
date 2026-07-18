import type { SourceAdapter } from "@/lib/collection/types";

export const buildingRegisterAdapter: SourceAdapter = {
  code: "building-register", cycle: "monthly",
  async collect() {
    return {
      sourceCode: this.code,
      status: "empty",
      recordsRead: 0,
      recordsSaved: 0,
      recordsSkipped: 0,
      indicators: [],
      error: "총괄표제부만으로 가리봉동 전체 건축물을 대표할 수 있는지 검증이 불충분합니다.",
    };
  },
};
