from rest_framework import serializers

from bank.models import QuestionReport


class GeneratePaperSerializer(serializers.Serializer):
    difficulty = serializers.ChoiceField(choices=["入门", "初级", "中级", "高级", "专家"])
    amount = serializers.ChoiceField(choices=[10, 20, 30, 50])


class SubmitExamSerializer(serializers.Serializer):
    answers = serializers.DictField(child=serializers.CharField(), required=False)


class QuestionReportCreateSerializer(serializers.Serializer):
    question_id = serializers.IntegerField(min_value=1)
    issue_type = serializers.ChoiceField(choices=QuestionReport.ISSUE_TYPES)
    detail = serializers.CharField(max_length=500, allow_blank=False, trim_whitespace=True)


class QuestionReportReviewSerializer(serializers.Serializer):
    """运营处理：必须标记结论并填写处理说明。"""

    status = serializers.ChoiceField(choices=[("resolved", "已修正"), ("rejected", "无需修改")])
    handling_note = serializers.CharField(max_length=500, allow_blank=False, trim_whitespace=True)
