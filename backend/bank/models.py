from django.conf import settings
from django.db import models


class LogicQuestion(models.Model):
    QUESTION_TYPES = [
        ("number", "数字推理"),
        ("figure", "图形推理"),
        ("logic", "逻辑判断"),
        ("analogy", "类比推理"),
        ("deduction", "演绎推理"),
    ]

    title = models.CharField(max_length=120)
    question_type = models.CharField(max_length=32, choices=QUESTION_TYPES)
    difficulty = models.CharField(max_length=16)
    stem = models.TextField()
    answer = models.CharField(max_length=32)
    explanation = models.TextField()
    knowledge = models.CharField(max_length=120)
    image = models.ImageField(upload_to="questions/", blank=True)

    def __str__(self) -> str:
        return self.title


class WrongBookEntry(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    question = models.ForeignKey(LogicQuestion, on_delete=models.CASCADE)
    mistakes = models.PositiveIntegerField(default=1)
    favorited = models.BooleanField(default=False)
    last_practiced_at = models.DateField(auto_now=True)

    class Meta:
        unique_together = ("user", "question")


class QuestionReport(models.Model):
    """用户对某道题的报错。题目数据当前由 views.QUESTIONS 维护，故只存题目 ID。"""

    ISSUE_TYPES = [
        ("stem", "题干有误"),
        ("answer", "答案有误"),
        ("explanation", "解析有误"),
        ("other", "其他问题"),
    ]
    STATUSES = [
        ("pending", "处理中"),
        ("resolved", "已修正"),
        ("rejected", "无需修改"),
    ]

    code = models.CharField(max_length=16, unique=True, blank=True, verbose_name="报错编号")
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="question_reports", on_delete=models.CASCADE
    )
    question_id = models.PositiveIntegerField(verbose_name="题目 ID")
    issue_type = models.CharField(max_length=16, choices=ISSUE_TYPES, verbose_name="问题类型")
    detail = models.CharField(max_length=500, verbose_name="补充说明")
    status = models.CharField(max_length=16, choices=STATUSES, default="pending", verbose_name="处理状态")
    handling_note = models.CharField(max_length=500, blank=True, default="", verbose_name="处理说明")
    handled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="handled_question_reports",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name="处理人",
    )
    handled_at = models.DateTimeField(null=True, blank=True, verbose_name="处理时间")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="提交时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        verbose_name = "题目报错"
        verbose_name_plural = "题目报错"
        constraints = [
            # 同一账号对同一道题只允许存在一条未处理报错，从数据库层兜底防重复
            models.UniqueConstraint(
                fields=["reporter", "question_id"],
                condition=models.Q(status="pending"),
                name="uniq_pending_report_per_question",
            )
        ]

    def save(self, *args, **kwargs):
        adding = self._state.adding
        super().save(*args, **kwargs)
        if adding and not self.code:
            self.code = f"R{self.pk:06d}"
            super().save(update_fields=["code"])

    def __str__(self) -> str:
        return f"{self.code} - 题目 {self.question_id}"
