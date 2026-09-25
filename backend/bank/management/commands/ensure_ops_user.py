import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "幂等创建运营账号（is_staff=True），用于处理题目报错"

    def add_arguments(self, parser):
        parser.add_argument("--username", default=os.getenv("OPS_USERNAME", "ops"))
        parser.add_argument("--password", default=os.getenv("OPS_PASSWORD", "ops123456"))

    def handle(self, *args, **options):
        User = get_user_model()
        username = options["username"]
        password = options["password"]
        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": f"{username}@gxlogic.local", "is_staff": True, "is_superuser": True},
        )
        if created:
            user.set_password(password)
            user.save(update_fields=["password"])
            self.stdout.write(self.style.SUCCESS(f"已创建运营账号：{username}"))
        else:
            updated = False
            if not user.is_staff:
                user.is_staff = True
                updated = True
            if not user.check_password(password):
                user.set_password(password)
                updated = True
            if updated:
                user.save(update_fields=["is_staff", "password"])
            self.stdout.write(f"运营账号已存在：{username}（权限与密码已校准）")
