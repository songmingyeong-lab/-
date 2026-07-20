import { formatScoreInterpretation } from "@/lib/scoring/calculations";
import type { CategoryScoreResult } from "@/lib/scoring/types";

const statusLabels = {
  CALCULATED: "정상 산출",
  LIMITED_DATA: "자료 제한",
  NOT_CALCULABLE: "산출 보류",
  INFORMATION_ONLY: "정보 제공용",
} as const;

export function CategoryScoreSummary({ result }: { result: CategoryScoreResult }) {
  return (
    <div className="category-score-summary" aria-label={`${result.categoryName} 영역 진단점수`}>
      <div className="category-score-main">
        <div><span className="score-label">영역 진단점수</span><strong>{result.score === null ? "산출 보류" : `${result.score.toFixed(1)} / 5.0`}</strong></div>
        <span className={`score-status score-status-${result.scoreStatus.toLowerCase()}`}>{statusLabels[result.scoreStatus]}</span>
      </div>
      <div className="category-score-meta">
        <span>점수 상태 <strong>{statusLabels[result.scoreStatus]}</strong></span>
        <span>데이터 완성도 <strong>{result.dataCoverage.toFixed(1)}%</strong></span>
        <span>계산 가능 <strong>{result.availableIndicatorCount}/{result.totalIndicatorCount}개</strong></span>
        <span>{formatScoreInterpretation(result.score)}</span>
      </div>
      <details className="score-help">
        <summary>점수 기준 설명</summary>
        <p>같은 원천·기준기간·단위의 공간 비교율을 1~5점으로 환산합니다. 공식 코드 비교가 불가능하면 명칭·법정동 기반 대체비교 또는 임시 중립점수를 사용하고 카드에 산출 주의를 표시합니다. 전체 가중치의 50% 미만이면 영역점수 표시를 보류합니다.</p>
      </details>
    </div>
  );
}
