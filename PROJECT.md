# Project: Domain-Specific Marquee Tickers for GitHub Profile

## Architecture
- **Asset Generation**: 8 file SVG độc lập trong `assets/` (4 domain x 2 theme light/dark).
  - Tọa độ `viewBox="0 0 3600 256"`, hiển thị với `height="64"`, scale factor 0.25 (card size 64x64px, gap 11px, rx=15px).
  - Infinite seamless loop: CSS `@keyframes` trượt `translateX`.
    - Nhóm 7 icons (Backend, Frontend): 4 chu kỳ nhân bản (28 cards), trượt -2100px trong 10s.
    - Nhóm 5 icons (DevOps, Observability): 5 chu kỳ nhân bản (25 cards), trượt -1500px trong 7s (hoặc -3000px trong 14s).
  - 100% inline SVG vector paths, self-contained, không dùng external URL / `<image href="...">`, an toàn tuyệt đối với GitHub Camo Proxy.
  - Unique ID trong `<defs>` cho mỗi instance chu kỳ tránh DOM ID collision.
- **Profile Presentation**: `README.md` thay thế 4 hàng thẻ `<p align="left">...` bằng 4 khối `<div align="center"><picture>...</picture></div>` adaptive light/dark mode.
  - Giữ nguyên tiêu đề domain `###` thuần tiếng Anh, không thêm emoji.
  - Đảm bảo dòng trống chuẩn Markdownlint (`MD022`, `MD012`, `MD045`).
- **Verification & Git Delivery**:
  - Xác minh XML hợp lệ cho cả 8 file SVG.
  - `npx markdownlint-cli -c .markdownlint.json README.md` exit code 0.
  - Git commit: `feat(profile): animate domain icon groups as per-section marquee tickers`.
  - Git push `origin/main` và kiểm tra working tree clean.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Marquee Backend SVGs | Tạo `assets/marquee-backend-light.svg` và `dark.svg` (7 icons: java, spring, postgres, mysql, redis, python, kafka) | M1 | ORIGINAL_REQUEST R1 |
| 2 | Marquee Frontend SVGs | Tạo `assets/marquee-frontend-light.svg` và `dark.svg` (7 icons: ts, js, react, nextjs, tailwind, html, css) | M1 | ORIGINAL_REQUEST R1 |
| 3 | Marquee DevOps SVGs | Tạo `assets/marquee-devops-light.svg` và `dark.svg` (5 icons: docker, kubernetes, linux, git, github) | M1 | ORIGINAL_REQUEST R1 |
| 4 | Marquee Observability SVGs | Tạo `assets/marquee-observability-light.svg` và `dark.svg` (5 icons: prometheus, grafana, postman, idea, vscode) | M1 | ORIGINAL_REQUEST R1 |
| 5 | Adaptive `<picture>` in README | Thay thế 4 hàng static icon trong `README.md` bằng 4 khối `<picture>` adaptive light/dark, giữ nguyên heading `###` | M1 | ORIGINAL_REQUEST R2 |
| 6 | Quality & Linting Verification | XML validation cho 8 SVGs, markdownlint exit code 0 | M1 | ORIGINAL_REQUEST R3 |
| 7 | Git Commit & Push | Commit với thông điệp chuẩn tiếng Anh và push lên `origin/main` | M1 | ORIGINAL_REQUEST R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Domain Marquee Implementation & Profile Integration | Toàn bộ 8 file SVG, cập nhật README.md, kiểm thử XML & linter, commit & push git | Survey | DONE |

## Code Layout
- `assets/marquee-backend-light.svg`
- `assets/marquee-backend-dark.svg`
- `assets/marquee-frontend-light.svg`
- `assets/marquee-frontend-dark.svg`
- `assets/marquee-devops-light.svg`
- `assets/marquee-devops-dark.svg`
- `assets/marquee-observability-light.svg`
- `assets/marquee-observability-dark.svg`
- `README.md` (lines 84-126)
