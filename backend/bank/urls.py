from django.urls import path

from bank import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("dashboard/", views.dashboard, name="dashboard"),
    path("papers/generate/", views.generate_paper, name="generate-paper"),
    path("exams/submit/", views.submit_exam, name="submit-exam"),
    path("auth/demo-login/", views.demo_login, name="demo-login"),
    path("auth/ops-login/", views.ops_login, name="ops-login"),
    path("reports/", views.create_report, name="create-report"),
    path("reports/mine/", views.my_reports, name="my-reports"),
    path("reports/pending/", views.pending_reports, name="pending-reports"),
    path("reports/<int:report_id>/resolve/", views.resolve_report, name="resolve-report"),
]
