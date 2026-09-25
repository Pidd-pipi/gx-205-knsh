from django.urls import path

from bank import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("dashboard/", views.dashboard, name="dashboard"),
    path("papers/generate/", views.generate_paper, name="generate-paper"),
    path("exams/submit/", views.submit_exam, name="submit-exam"),
    path("auth/demo-login/", views.demo_login, name="demo-login"),
    # 题目报错（练习端）
    path("reports/", views.create_report, name="report-create"),
    path("reports/mine/", views.my_reports, name="report-mine"),
    # 题目报错（运营后台）
    path("admin/reports/", views.admin_reports, name="admin-report-list"),
    path("admin/reports/<int:report_id>/review/", views.admin_review_report, name="admin-report-review"),
]
