import sys
with open('audit.py', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace("open(df_path, 'r')", "open(df_path, 'r', encoding='utf-8')")
content = content.replace("open(bs_path, 'r')", "open(bs_path, 'r', encoding='utf-8')")
with open('audit.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed')
