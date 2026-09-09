# common/config.py —— 配置统一入口（Day 3 起各天脚本共用）
# 好处：换模型/换网关只改 .env，代码一行不动
import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())          # 向上递归找 .env，从子目录运行也能读到

API_KEY = os.getenv("OPENAI_API_KEY")
BASE_URL = os.getenv("OPENAI_BASE_URL")
MODEL = os.getenv("OPENAI_MODEL", "deepseek-chat")
