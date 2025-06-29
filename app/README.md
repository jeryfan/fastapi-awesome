#### alembic 初始化

###### 初始化

```bash
alembic init alembic
```

###### 生成新的版本

```bash
alembic revision --autogenerate -m "initial"
```

###### 运行迁移

```bash
alembic upgrade head
```

#### 重置 alembic

###### 删除版本

```bash
rm -rf alembic/versions
```

###### 删除版本表

```bash
docker exec -it db bash
psql -U fastapi -d fastapi
\c fastapi
drop table alembic_version;

# 或者
alembic downgrade base

```

###### 最后再次初始化即可
