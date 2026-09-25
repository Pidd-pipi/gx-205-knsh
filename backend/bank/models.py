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
    ISSUE_TYPES = [
        ("stem", "题干有误"),
        ("answer", "答案有误"),
        ("explanation", "解析有误"),
        ("other", "其他问题"),
    ]
    STATUS_CHOICES = [
        ("pending", "处理中"),
        ("fixed", "已修正"),
        ("nochange", "无需修改"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="question_reports")
    question_id = models.PositiveIntegerField()
    question_stem = models.CharField(max_length=200, blank=True)
    issue_type = models.CharField(max_length=16, choices=ISSUE_TYPES)
    note = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="pending")
    resolution_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"报错#{self.pk} 题目{self.question_id}"
