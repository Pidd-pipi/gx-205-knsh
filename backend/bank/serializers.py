from rest_framework import serializers

from bank.models import QuestionReport


class GeneratePaperSerializer(serializers.Serializer):
    difficulty = serializers.ChoiceField(choices=["入门", "初级", "中级", "高级", "专家"])
    amount = serializers.ChoiceField(choices=[10, 20, 30, 50])


class SubmitExamSerializer(serializers.Serializer):
    answers = serializers.DictField(child=serializers.CharField(), required=False)


class QuestionReportCreateSerializer(serializers.Serializer):
    question_id = serializers.IntegerField(min_value=1)
    issue_type = serializers.ChoiceField(choices=[choice[0] for choice in QuestionReport.ISSUE_TYPES])
    note = serializers.CharField(required=False, allow_blank=True, max_length=500)


class QuestionReportResolveSerializer(serializers.Serializer):
    result = serializers.ChoiceField(choices=["fixed", "nochange"])
    note = serializers.CharField(allow_blank=False, max_length=500)


class QuestionReportSerializer(serializers.ModelSerializer):
    issue_type_label = serializers.CharField(source="get_issue_type_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = QuestionReport
        fields = [
            "id",
            "question_id",
            "question_stem",
            "issue_type",
            "issue_type_label",
            "note",
            "status",
            "status_label",
            "resolution_note",
            "username",
            "created_at",
            "resolved_at",
        ]
