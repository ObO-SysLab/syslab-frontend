# AUDIT-08 프론트 릴리스

기존 main push의 무조건 S3 sync --delete 및 CloudFront 무효화 대신 npm test → tsc → 정적 build → 커밋/파일 checksum 아티팩트 생성으로 변경했다. AWS 인증과 자동 배포는 제거했다. 실제 원격 workflow 실행·push·배포 없음.

승인된 배포 전 동일 릴리스의 백엔드/터미널 API 계약과 브라우저 동작을 확인하고 이전 out 전체 및 CloudFront 설정을 보존한다. 승인 후 정확한 아티팩트를 업로드하고 실패하면 직전 out 전체를 복원한다. 운영 배포 실행·복구안은 syslab-infra/ops/RELEASE.md에 연결한다.

검증: Vitest 76개, TypeScript, Next 정적 32페이지 빌드 통과. 첫 빌드는 네트워크 제한으로 Google Fonts 다운로드 실패했고 네트워크 허용 재실행에서 통과했다. 차트 크기 경고 1건은 남아 있으며 브라우저 시각 검증은 미실시다. 세 저장소 workflow YAML 구문/필수 키 검사 통과.

