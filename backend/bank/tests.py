from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from bank.models import QuestionReport

User = get_user_model()


class QuestionReportFlowTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="student", password="pwd123456")
        self.other = User.objects.create_user(username="classmate", password="pwd123456")
        self.ops = User.objects.create_user(username="ops", password="pwd123456", is_staff=True)

    def create_report(self, question_id=101, issue_type="answer", detail="参考答案给错了", user=None):
        self.client.force_authenticate(user=user or self.user)
        return self.client.post(
            "/reports/",
            {"question_id": question_id, "issue_type": issue_type, "detail": detail},
            format="json",
        )

    def test_anonymous_cannot_report(self):
        response = self.client.post(
            "/reports/",
            {"question_id": 101, "issue_type": "answer", "detail": "x"},
            format="json",
        )
        self.assertEqual(response.status_code, 401)

    def test_create_report_generates_code(self):
        response = self.create_report()
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertFalse(body["duplicated"])
        self.assertTrue(body["report"]["code"].startswith("R"))
        self.assertEqual(body["report"]["status"], "pending")
        self.assertEqual(QuestionReport.objects.count(), 1)

    def test_duplicate_pending_returns_original_code(self):
        first = self.create_report().json()["report"]
        second = self.create_report(detail="换个说法再报一次")
        self.assertEqual(second.status_code, 200)
        body = second.json()
        self.assertTrue(body["duplicated"])
        self.assertEqual(body["report"]["code"], first["code"])
        self.assertEqual(QuestionReport.objects.filter(reporter=self.user).count(), 1)

    def test_other_user_same_question_is_separate_report(self):
        self.create_report()
        response = self.create_report(user=self.other)
        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.json()["duplicated"])

    def test_invalid_question_id_rejected(self):
        response = self.create_report(question_id=999)
        self.assertEqual(response.status_code, 400)

    def test_blank_detail_rejected(self):
        response = self.create_report(detail="   ")
        self.assertEqual(response.status_code, 400)

    def test_dashboard_includes_pending_status_and_question_still_usable(self):
        self.create_report()
        self.client.force_authenticate(self.user)
        body = self.client.get("/dashboard/").json()
        question = next(q for q in body["paper"] if q["id"] == 101)
        self.assertEqual(question["reportStatus"]["status"], "pending")
        # 处理中时原题、选项、答案、解析照常返回
        self.assertTrue(question["options"])
        self.assertEqual(question["answer"], "42")
        self.assertIn("相邻差", question["explanation"])

    def test_anonymous_dashboard_has_null_status(self):
        body = self.client.get("/dashboard/").json()
        self.assertIsNone(body["paper"][0]["reportStatus"])

    def test_non_staff_cannot_access_admin_list(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get("/admin/reports/").status_code, 403)

    def test_full_review_resolved_flow_and_refiled_report(self):
        code = self.create_report().json()["report"]["code"]
        report = QuestionReport.objects.get(code=code)

        # 处理说明必填
        self.client.force_authenticate(self.ops)
        bad = self.client.post(
            f"/admin/reports/{report.id}/review/",
            {"status": "resolved", "handling_note": "  "},
            format="json",
        )
        self.assertEqual(bad.status_code, 400)

        response = self.client.post(
            f"/admin/reports/{report.id}/review/",
            {"status": "resolved", "handling_note": "已将答案修正为 42，并补充图示说明。"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        report.refresh_from_db()
        self.assertEqual(report.status, "resolved")
        self.assertEqual(report.handled_by, self.ops)
        self.assertIsNotNone(report.handled_at)

        # 用户再做到这道题可以看到处理结果
        self.client.force_authenticate(self.user)
        body = self.client.get("/dashboard/").json()
        status = next(q for q in body["paper"] if q["id"] == 101)["reportStatus"]
        self.assertEqual(status["status"], "resolved")
        self.assertEqual(status["statusLabel"], "已修正")
        self.assertIn("已将答案修正", status["handlingNote"])

        # 已处理后允许再次报错，生成新编号
        again = self.create_report(issue_type="explanation", detail="解析还有歧义")
        self.assertEqual(again.status_code, 201)
        self.assertNotEqual(again.json()["report"]["code"], code)

    def test_rejected_flow(self):
        report_id = self.create_report().json()  # code 不直接取 id
        pending = QuestionReport.objects.get(reporter=self.user, question_id=101)

        self.client.force_authenticate(self.ops)
        response = self.client.post(
            f"/admin/reports/{pending.id}/review/",
            {"status": "rejected", "handling_note": "经核对原题与答案均无误。"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        self.client.force_authenticate(self.user)
        status = self.client.get("/reports/mine/").json()["results"][0]
        self.assertEqual(status["status"], "rejected")
        self.assertEqual(status["statusLabel"], "无需修改")

    def test_admin_filter_by_status(self):
        self.create_report()
        self.client.force_authenticate(self.ops)
        body = self.client.get("/admin/reports/?status=pending").json()
        self.assertEqual(len(body["results"]), 1)
        body = self.client.get("/admin/reports/?status=resolved").json()
        self.assertEqual(body["results"], [])
