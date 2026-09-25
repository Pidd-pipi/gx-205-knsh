from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone
from rest_framework import status as http_status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from bank.models import QuestionReport
from bank.serializers import (
    GeneratePaperSerializer,
    QuestionReportCreateSerializer,
    QuestionReportReviewSerializer,
    SubmitExamSerializer,
)


QUESTIONS = [
    {
        "id": 101,
        "type": "数字推理",
        "difficulty": "中级",
        "stem": "2，6，12，20，30，下一项是多少？",
        "options": ["38", "40", "42", "44"],
        "answer": "42",
        "explanation": "相邻差为 4、6、8、10，下一差为 12，因此答案为 42。",
        "knowledge": "二级等差",
    },
    {
        "id": 102,
        "type": "逻辑判断",
        "difficulty": "中级",
        "stem": "所有通过高阶训练的人都完成错题复盘，小林完成高阶训练，可推出什么？",
        "options": ["小林完成错题复盘", "小林没有错题", "小林排名第一", "无法判断"],
        "answer": "小林完成错题复盘",
        "explanation": "这是充分条件推理：完成高阶训练可以推出完成错题复盘。",
        "knowledge": "充分条件",
    },
    {
        "id": 103,
        "type": "类比推理",
        "difficulty": "初级",
        "stem": "医生：诊断，相当于教师：？",
        "options": ["备课", "授课", "批改", "讲解"],
        "answer": "授课",
        "explanation": "职业与核心工作行为对应，医生核心行为是诊断，教师核心行为是授课。",
        "knowledge": "职业关系",
    },
]

QUESTION_IDS = {question["id"] for question in QUESTIONS}
ISSUE_TYPE_LABELS = dict(QuestionReport.ISSUE_TYPES)
STATUS_LABELS = dict(QuestionReport.STATUSES)


def attach_report_status(paper, user) -> None:
    """在每道题上附带当前账号的最新报错状态，未登录或未报错时为 None。

    报错状态独立于题干、选项、答案和解析，处理中也不会影响正常答题。
    """
    if not user.is_authenticated:
        for question in paper:
            question["reportStatus"] = None
        return

    question_ids = [question["id"] for question in paper]
    latest: dict[int, QuestionReport] = {}
    reports = QuestionReport.objects.filter(reporter=user, question_id__in=question_ids).order_by("-created_at")
    for report in reports:
        # 已按创建时间倒序，首次出现即该题最新一条
        latest.setdefault(report.question_id, report)

    for question in paper:
        report = latest.get(question["id"])
        question["reportStatus"] = serialize_report_status(report) if report else None


def serialize_report_status(report: QuestionReport) -> dict:
    return {
        "code": report.code,
        "issueType": report.issue_type,
        "issueTypeLabel": ISSUE_TYPE_LABELS[report.issue_type],
        "status": report.status,
        "statusLabel": STATUS_LABELS[report.status],
        "handlingNote": report.handling_note,
        "createdAt": timezone.localtime(report.created_at).strftime("%Y-%m-%d %H:%M"),
        "handledAt": timezone.localtime(report.handled_at).strftime("%Y-%m-%d %H:%M")
        if report.handled_at
        else None,
    }


def build_dashboard(user) -> dict:
    paper = [dict(question) for question in QUESTIONS]
    attach_report_status(paper, user)
    return {
        "profile": {
            "nickname": "推理训练示例用户",
            "tier": "铂金",
            "totalAnswered": 1260,
            "correctRate": 86.5,
            "streakDays": 19,
            "practiceMinutes": 2480,
        },
        "categories": [
            {"id": 1, "name": "数字推理", "accuracy": 88, "total": 320},
            {"id": 2, "name": "图形推理", "accuracy": 76, "total": 240},
            {"id": 3, "name": "逻辑判断", "accuracy": 91, "total": 280},
            {"id": 4, "name": "类比推理", "accuracy": 84, "total": 210},
            {"id": 5, "name": "演绎推理", "accuracy": 80, "total": 210},
        ],
        "paper": paper,
        "wrongBook": [
            {"id": 1, "title": "集合包含关系反推", "type": "演绎推理", "mistakes": 5, "lastPracticed": "05-28"},
            {"id": 2, "title": "九宫格旋转规律", "type": "图形推理", "mistakes": 4, "lastPracticed": "05-27"},
            {"id": 3, "title": "多条件排序", "type": "逻辑判断", "mistakes": 3, "lastPracticed": "05-26"},
        ],
        "rankings": [
            {"rank": 1, "name": "ReasonMax", "tier": "王者", "score": 9820, "accuracy": 94.2},
            {"rank": 2, "name": "DeducePro", "tier": "钻石", "score": 8760, "accuracy": 91.7},
            {"rank": 3, "name": "推理训练示例用户", "tier": "铂金", "score": 7650, "accuracy": 86.5},
        ],
        "radar": [
            {"axis": "数字", "value": 88},
            {"axis": "图形", "value": 76},
            {"axis": "逻辑", "value": 91},
            {"axis": "类比", "value": 84},
            {"axis": "演绎", "value": 80},
        ],
    }


@api_view(["GET"])
def health(_request):
    return Response({"status": "ok", "service": "gxlogic-bank-backend"})


@api_view(["GET"])
def dashboard(request):
    return Response(build_dashboard(request.user))


@api_view(["POST"])
def generate_paper(request):
    serializer = GeneratePaperSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    amount = int(serializer.validated_data["amount"])
    paper = [dict(question) for question in (QUESTIONS * ((amount // len(QUESTIONS)) + 1))[:amount]]
    attach_report_status(paper, request.user)
    return Response({"paper": paper})


@api_view(["POST"])
def submit_exam(request):
    serializer = SubmitExamSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    answers = serializer.validated_data.get("answers", {})
    correct = sum(1 for question in QUESTIONS if answers.get(str(question["id"])) == question["answer"])
    score = round(correct / len(QUESTIONS) * 100)
    return Response(
        {
            "score": score,
            "rank_hint": "本次表现接近黄金 I，继续强化图形推理可冲击铂金。",
            "analysis": ["数字推理稳定", "图形旋转规律仍需复盘", "演绎推理建议练习充分必要条件"],
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_report(request):
    """提交题目报错。

    同一账号对同一道题若已有一条未处理报错，直接返回原编号，不重复生成。
    """
    serializer = QuestionReportCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    question_id = serializer.validated_data["question_id"]
    if question_id not in QUESTION_IDS:
        raise ValidationError({"question_id": "题目不存在"})

    existing = QuestionReport.objects.filter(
        reporter=request.user, question_id=question_id, status="pending"
    ).first()
    if existing is not None:
        return Response(
            {"duplicated": True, "report": serialize_report_status(existing)},
            status=http_status.HTTP_200_OK,
        )

    report = QuestionReport(
        reporter=request.user,
        question_id=question_id,
        issue_type=serializer.validated_data["issue_type"],
        detail=serializer.validated_data["detail"],
    )
    try:
        report.save()
    except IntegrityError:
        # 并发提交时唯一约束兜底
        existing = QuestionReport.objects.get(
            reporter=request.user, question_id=question_id, status="pending"
        )
        return Response(
            {"duplicated": True, "report": serialize_report_status(existing)},
            status=http_status.HTTP_200_OK,
        )

    return Response(
        {"duplicated": False, "report": serialize_report_status(report)},
        status=http_status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_reports(request):
    """当前账号的报错记录，按提交时间倒序。"""
    reports = QuestionReport.objects.filter(reporter=request.user).order_by("-created_at")
    return Response({"results": [serialize_report_status(report) for report in reports]})


def serialize_admin_report(report: QuestionReport) -> dict:
    data = serialize_report_status(report)
    data.update(
        {
            "id": report.id,
            "questionId": report.question_id,
            "detail": report.detail,
            "reporter": report.reporter.username,
            "handledBy": report.handled_by.username if report.handled_by else None,
        }
    )
    return data


@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_reports(request):
    """运营后台：查看报错列表（可按状态/题目筛选）。"""
    if not request.user.is_staff:
        raise PermissionDenied("需要运营权限")

    queryset = QuestionReport.objects.select_related("reporter", "handled_by").order_by("-created_at")
    status_filter = request.query_params.get("status")
    if status_filter:
        if status_filter not in dict(QuestionReport.STATUSES):
            raise ValidationError({"status": "状态不合法"})
        queryset = queryset.filter(status=status_filter)
    question_id = request.query_params.get("question_id")
    if question_id:
        queryset = queryset.filter(question_id=question_id)

    return Response({"results": [serialize_admin_report(report) for report in queryset]})


@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_review_report(request, report_id: int):
    """运营标记处理结果：已修正 / 无需修改，并填写处理说明。"""
    if not request.user.is_staff:
        raise PermissionDenied("需要运营权限")

    report = QuestionReport.objects.filter(pk=report_id).first()
    if report is None:
        return Response({"detail": "报错记录不存在"}, status=http_status.HTTP_404_NOT_FOUND)

    serializer = QuestionReportReviewSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    report.status = serializer.validated_data["status"]
    report.handling_note = serializer.validated_data["handling_note"]
    report.handled_by = request.user
    report.handled_at = timezone.now()
    report.save(update_fields=["status", "handling_note", "handled_by", "handled_at", "updated_at"])
    return Response(serialize_admin_report(report))


@api_view(["POST"])
def demo_login(_request):
    User = get_user_model()
    user, _ = User.objects.get_or_create(username="demo", defaults={"email": "demo@example.com"})
    user.set_password("demo1234")
    user.save(update_fields=["password"])
    refresh = RefreshToken.for_user(user)
    return Response({"access": str(refresh.access_token), "refresh": str(refresh)})
