# 免费部署指南（Demo 用）

后端 + 页面是**同一个服务**（Flask 托管静态页 + API），部署一个服务即可得到完整可访问的公网 Demo。
以下两个平台都有永久免费档、无需信用卡，任选其一。**部署需要你注册平台账号（邮箱即可），这一步只能本人完成**，其余按下面步骤点几下就好。

> ⚠️ 免费档共性：SQLite 数据存在实例盘上，**重新部署/重启后数据会重置为种子数据**（对演示无影响）；Render 免费实例 15 分钟无访问会休眠，首次唤醒约等 30 秒。

## 方案 A：Render（推荐，最省事）

1. 把 `03-Demo网站/` 这个文件夹推到一个 GitHub 仓库（仓库可设 Private）
2. 注册/登录 [render.com](https://render.com) → New + → **Web Service** → 连接该仓库
3. Render 会自动读到仓库里的 `render.yaml`，确认后点 **Apply**，什么都不用填
4. 等 2–3 分钟构建完成，得到 `https://xxxx.onrender.com`，直接访问即是登录页

更新代码：推送到 GitHub 即自动重新部署。

## 方案 B：Hugging Face Spaces（国内访问通常更稳）

1. 注册/登录 [huggingface.co](https://huggingface.co) → New **Space** → SDK 选 **Docker**（Blank 模板）
2. 把 `03-Demo网站/` 里的文件全部上传到 Space（`Dockerfile` 已备好，监听 7860 端口符合其要求）
3. 等 Build 完成，得到 `https://huggingface.co/spaces/<你的用户名>/<空间名>` 的公网地址

## 本地验证部署产物（部署前建议）

```bash
pip install -r backend/requirements.txt
cd backend && gunicorn wsgi:app --workers 2 --bind 0.0.0.0:8686
# 访问 http://localhost:8686 确认与 python backend/app.py 行为一致
```

## 部署后检查清单

- [ ] 打开首页出现登录页（无「象」印章图标）
- [ ] teacher / zx123456 登录老师端
- [ ] 学员输入 S2026001 / zx123456 登录学员端
- [ ] 老师端添加一条学习记录 → 学员端刷新可见
- [ ] 导出 Excel 正常下载
