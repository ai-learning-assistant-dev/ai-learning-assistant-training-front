@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM 设置网络代理
set https_proxy=http://127.0.0.1:10809
set http_proxy=http://127.0.0.1:10809
set all_proxy=socks5://127.0.0.1:10808

REM 目标仓库URL
set TARGET_REPO=https://gitee.com/shiftonetothree/ai-learning-assistant-training-front-dist.git
set TARGET_DIR=dist-deploy

echo ========================================
echo 开始推送dist目录到Gitee仓库
echo ========================================

REM 检查dist目录是否存在
if not exist "dist" (
    echo 错误: dist目录不存在！
    echo 请先运行构建命令生成dist目录
    pause
    exit /b 1
)

REM 检查git是否安装
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: git未安装或不在PATH中！
    pause
    exit /b 1
)

REM 删除旧的部署目录（如果存在）
if exist "%TARGET_DIR%" (
    echo 删除旧的部署目录...
    rmdir "%TARGET_DIR%" /s /q
)

REM 克隆目标仓库
echo 克隆目标仓库...
git clone %TARGET_REPO% "%TARGET_DIR%"
if %errorlevel% neq 0 (
    echo 错误: 克隆仓库失败！
    pause
    exit /b 1
)

REM 进入目标目录
cd "%TARGET_DIR%"

REM 清空目标目录中的所有文件（除了.git目录）
echo 清理目标目录...
for /f "tokens=*" %%i in ('dir /b /a-d') do (
    echo 删除文件: %%i
    del "%%i" /f /q
)

for /f "tokens=*" %%i in ('dir /b /ad ^| findstr /v /i ".git"') do (
    echo 删除目录: %%i
    rmdir "%%i" /s /q
)

REM 复制dist目录中的所有文件到目标目录
echo 复制dist目录内容...
xcopy "..\dist\*" "." /E /Y /I

REM 添加所有文件
git add .

REM 提交更改
echo 提交更改...
git commit -m "自动部署: %date% %time%"

REM 推送到远程仓库（使用master分支）
echo 推送到远程仓库...
git push origin master

if %errorlevel% equ 0 (
    echo ========================================
    echo 推送成功！
    echo ========================================
) else (
    echo ========================================
    echo 推送失败！
    echo ========================================
    pause
    exit /b 1
)

REM 返回上级目录
cd ..

REM 清理部署目录（可选）
REM echo 清理部署目录...
REM rmdir "%TARGET_DIR%" /s /q

echo 操作完成！
pause