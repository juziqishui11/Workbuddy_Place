@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0.."

echo ============================================================
echo  Workbench 内容同步
echo  (1/6) 抓取 SkillHub 推荐快照
echo  (2/6) 扫描本机已安装技能
echo  (3/6) 生成 WB案例资讯快照
echo  (4/6) 扫描 Obsidian 仓库目录
echo  (5/6) 整理 IMA 快照数据
echo  (6/6) 重建 index.html
echo ------------------------------------------------------------
echo  注：IMA 的原始数据需要 AI 采集（node 调不了 MCP）。
echo      请在文档库点「IMA 知识库 -^> 同步」发起采集任务；
echo      采集后重跑本脚本即可把结果烘焙进页面。
echo ============================================================
echo.

rem 优先用 PATH 里的 node；找不到则回退到 WorkBuddy 自带 node
set NODE=node
where node >nul 2>nul
if errorlevel 1 (
  if exist "%USERPROFILE%\.workbuddy\binaries\node\versions\current\node.exe" (
    set NODE="%USERPROFILE%\.workbuddy\binaries\node\versions\current\node.exe"
  ) else (
    echo [错误] 找不到 node，请先安装 Node.js 或让 WorkBuddy 准备好自带 node。
    echo.
    pause
    exit /b 1
  )
)

echo --- (1/6) 抓取 SkillHub 推荐快照 ---
%NODE% tools\skillhub-fetch.mjs
if errorlevel 1 (
  echo.
  echo [提示] 快照抓取失败（可能是网络问题），已保留原有快照继续。
  echo.
)

echo.
echo --- (2/6) 扫描本机已安装技能 ---
%NODE% tools\skills-sync.mjs
if errorlevel 1 (
  echo.
  echo [错误] 扫描本机技能失败，已中止。
  pause
  exit /b 1
)

echo.
echo --- (3/6) 生成 WB案例资讯快照 ---
%NODE% tools\wb-cases-fetch.mjs
if errorlevel 1 (
  echo.
  echo [提示] WB案例快照生成失败，已保留原有快照继续。
  echo.
)

echo.
echo --- (4/6) 扫描 Obsidian 仓库目录 ---
%NODE% tools\obsidian-scan.mjs
if errorlevel 1 (
  echo.
  echo [提示] Obsidian 仓库扫描失败（路径可能不存在），已保留原有快照继续。
  echo.
)

echo.
echo --- (5/6) 整理 IMA 快照数据 ---
%NODE% tools\ima-snapshot.mjs
if errorlevel 1 (
  echo.
  echo [提示] IMA 快照整理跳过（ima-raw.json 缺失或格式有误），已保留原有快照。
  echo.
)

echo.
echo --- (6/6) 重建 index.html ---
%NODE% build.mjs
if errorlevel 1 (
  echo.
  echo [错误] 构建失败，已中止。
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  同步完成！刷新（或重新打开）index.html 即可看到最新状态。
echo ============================================================
echo.
pause
