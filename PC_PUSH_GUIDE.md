# PC에서 LIMEN_WEB 올리기 (터미널용)

PC에서 고친 ver1·ver2를 GitHub `GISANGYU/LIMEN_WEB`의 `main`에 올리는 순서입니다.
클라우드에서 추가한 `CLAUDE.md`도 함께 받아 옵니다.
명령은 Windows PowerShell 기준이고, macOS 터미널에서도 그대로 쓸 수 있습니다(경로만 바꾸면 됩니다).

---

## 0. 먼저 확인할 것

```powershell
git --version          # 안 나오면 https://git-scm.com 에서 설치
cd <PC의 LIMEN_WEB 폴더 경로>
git status
```

- `On branch main ...` 같은 결과가 나오면 → **A**로 가세요.
- `fatal: not a git repository`가 나오면 → **B**로 가세요.

---

## A. 폴더가 이미 git 저장소일 때

```powershell
# 1) 바뀐 파일 확인
git status

# 2) 내 수정 커밋
git add -A
git commit -m "ver1·ver2 수정 반영"

# 3) GitHub 최신 main과 CLAUDE.md 브랜치 받아서 합치기
git pull origin main
git pull origin claude/claude-code-credit-cloud-qirp1j

# 4) 올리기
git push origin main
```

`git pull` 중에 `CONFLICT`가 나오면 멈추고, 그 출력 그대로 Claude에게 보여 주세요.

---

## B. 폴더가 git 저장소가 아닐 때

GitHub 저장소를 새 폴더로 받은 뒤, 내 수정본을 그 위에 덮어씁니다.
원본 폴더는 건드리지 않으니 안전합니다.

```powershell
# 1) 저장소 받기 (원본과 다른 위치)
cd $HOME\Desktop
git clone https://github.com/GISANGYU/LIMEN_WEB.git LIMEN_WEB_git
cd LIMEN_WEB_git

# 2) CLAUDE.md 브랜치 합치기
git pull origin claude/claude-code-credit-cloud-qirp1j

# 3) 내 수정본 복사 (.git 폴더는 제외)
robocopy "<PC의 LIMEN_WEB 폴더 경로>" . /E /XD .git
#   macOS: rsync -av --exclude .git "<원본 경로>/" ./

# 4) 바뀐 내용 확인 후 커밋·푸시
git status
git add -A
git commit -m "ver1·ver2 수정 반영"
git push origin main
```

이제부터는 `LIMEN_WEB_git` 폴더에서 작업하세요.

---

## 처음 push할 때 로그인

- `git push` 할 때 브라우저 로그인 창이 뜨면 GitHub 계정으로 로그인하면 됩니다.
- 처음 커밋 때 이름·이메일을 물으면 한 번만 설정합니다.

```powershell
git config --global user.name "GISANGYU"
git config --global user.email "<GitHub 이메일>"
```

---

## 올라갔는지 확인

```powershell
git log --oneline -3
```

https://github.com/GISANGYU/LIMEN_WEB 에서 최근 커밋 시간과 `CLAUDE.md`가 보이면 끝입니다.

---

## 앞으로 터미널에서 작업할 때

```powershell
cd <LIMEN_WEB 저장소 폴더>
git pull origin main     # 작업 시작 전에 최신 받기
claude                   # Claude Code 실행 (CLAUDE.md를 자동으로 읽음)
```

- 작업이 끝나면 `git add -A`, `git commit -m "..."`, `git push origin main` 순서로 올립니다.
- 클라우드 세션은 GitHub에 올라간 것만 볼 수 있으니, 클라우드로 넘기기 전에는 꼭 push 하세요.
- 로컬 메모리(실측값, 용어 규칙)는 `CLAUDE.md` 아래쪽 TODO 자리에 옮겨 적어 두면 어디서든 같이 쓸 수 있습니다.
