# -*- coding: utf-8 -*-
"""生产 WSGI 入口：gunicorn wsgi:app

首次启动自动建库（backend/zhxx.db，含种子数据）；重启沿用已有数据。
"""
from app import app, init_db

init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8686, threaded=True)
