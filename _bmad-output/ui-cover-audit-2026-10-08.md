# 표지 기반 디자인 독립 UI 검증

2026-10-08. 별도 Chromium headless context에서 최종 production preview `http://127.0.0.1:5299`를 검사했다. 애플리케이션 소스는 수정하지 않았다. 이전 감사 문서는 보존했다.

## 결론

검사한 화면에서 필수 개선이 남아 있지 않다. 처음 발견한 320px 날짜·시간 값 잘림과 3440px 일지 읽기 폭 문제는 수정된 production에서 해소됐다.

## 검사 범위와 방법

- `/tmp/lighthouse-review/cover.png`를 직접 확인했다. 남색 바탕, 은빛 등대·광선·별, 밝은 글자와 테두리가 기준 표지에 나타났다.
- 320 / 390 / 768 / 1440 / 3440px × paper / night의 10개 조합을 각각 새 브라우저 context로 실행했다.
- 각 조합에서 오늘 밤 초기, 임무 판정 결과, 펼친 플레이 일지, 규칙 찾기, 규칙 drawer, 설정 drawer의 6개 상태를 캡처하고 DOM을 측정했다. 최종 재검증은 총 60개 화면이다.
- 대표 모바일/태블릿/데스크톱/ultrawide 캡처를 픽셀로 검토했다. 수정 후 320px 두 테마의 native 날짜·시간 값과 3440px 일지·규칙의 제한 폭도 직접 확인했다.
- 설정 drawer에서 Tab 20회, Shift+Tab 20회, Escape를 10개 조합에서 실행했다. 규칙 drawer Escape와 임무 결과의 최초 포커스 위치도 확인했다.

## 최종 관찰 결과

| 항목 | 직접 관찰한 결과 |
| --- | --- |
| 가로 overflow | 60개 화면 모두 문서 및 검사 패널의 가로 overflow 없음 |
| 런타임 오류 | 10개 조합 모두 `pageerror` 없음 |
| 일반 텍스트 잘림 | HTML 제목·문단·라벨·버튼의 폭 초과 없음. 대표 캡처에서 텍스트 겹침 없음 |
| 320px native 입력 | 두 테마에서 `10/08/2026`과 `10:30 PM`이 한 열로 배치되어 끝까지 표시됨 |
| 텍스트 대비 표본 | 계산 가능한 본문·라벨·보조문구·버튼·탭·규칙 표본의 최저 대비 5.75:1 |
| 모바일 네 탭 | 320px에서 각 76×63px, 390px에서 각 93.5×63px. 네 항목 모두 표시됨 |
| 3440px 임무 화면 | app-shell 1420px, play-desk 960px |
| 3440px 읽기 폭 | 일지 본문 882px, 규칙 패널 940px, 첫 규칙 설명 문단 862px |
| 임무 결과 포커스 | 모든 조합에서 결과 제목 H2 ‘무언가 돌봄을 필요로 합니다’에 최초 포커스 |
| drawer 키보드 | Tab/Shift+Tab 순회 중 배경 페이지 조작 요소로 포커스가 넘어가지 않음 |
| Escape 복귀 | 설정은 ‘보관 및 설정’, 규칙은 원래 ‘규칙 p.35–37’ 버튼으로 복귀 |
| 장식의 조작 방해 | 등대 SVG는 `aria-hidden=true` 및 `pointer-events:none`. 배경 `body::before`도 `pointer-events:none` |

대비 수치는 단색 CSS 배경을 합성해 계산한 표본이다. 광선·그라데이션 배경은 계산에 포함되지 않아 대표 캡처를 함께 검토했다. 전체 접근성 인증이나 모든 hover 상태의 검증을 의미하지 않는다.

최종 캡처에서 남색 배경, 은빛 등대·별·광선, paper의 밝은 기록 패널과 night의 남색 기록 패널이 같은 시각 언어로 나타났다. 화면의 주요 문구는 ‘오늘 밤 기록’, ‘임무 진행’, ‘플레이 일지’, ‘규칙 찾기’처럼 현재 기능을 설명했다. 대표 화면에서 장식이 제목이나 조작 요소의 가독성을 막지 않았다.

## 발견 후 수정 확인

1. 최초 320px 캡처에서는 native 날짜 input의 연도와 시간 input의 AM/PM 끝이 잘렸다. 일반 DOM overflow 측정으로 탐지되지 않는 내부 렌더링 문제였다. 최종 캡처에서는 날짜·시간이 한 열로 배치되고 값 전체가 표시됐다.
2. 최초 3440px 확장 일지 본문은 1242px였다. 최종 production의 같은 기록 본문은 882px로 측정됐다. 규칙도 940px 패널 안에서 표시됐다.

## 관찰 근거

- 최종60개 화면을 검사했고, 대표8개 최종 캡처는 `verification/cover-design/`에 JPEG로 보존했다. 전체60개의 DOM·대비·포커스 측정값도 보존했다. 중복 작업 PNG는 저장 공간을 절약하기 위해 정리했다.
- 화면별 폭·대비·overflow·포커스: `verification/cover-design/results.json`
- 키보드 순회·복귀·모바일 탭 크기: `verification/cover-design/keyboard-results.json`
- 규칙 패널과 설명 문단 실측: `verification/cover-design/read-widths.json`
- 재현 스크립트: `verification/cover-design/cover-ui-final-audit.cjs`, `verification/cover-design/cover-keyboard-final-audit.cjs`
- 최초 발견 근거는 `/tmp/lighthouse-review/cover-ui/`와 `/tmp/lighthouse-review/cover-ui-audit.md`에 별도로 보존했다.
