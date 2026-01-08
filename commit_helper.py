import subprocess
import os

os.chdir(r'C:\Users\djhui\OneDrive\Github\ha-reachy-mini-card')

# 添加所有文件
subprocess.run(['git', 'add', '-A'], check=True)

# 创建提交
commit_message = 'chore: prepare for V2.0.0 release - Add V2 direct connection version, update build scripts, add comprehensive documentation'
result = subprocess.run(['git', 'commit', '-m', commit_message], capture_output=True, text=True)
print("STDOUT:", result.stdout)
print("STDERR:", result.stderr)
print("Return code:", result.returncode)
