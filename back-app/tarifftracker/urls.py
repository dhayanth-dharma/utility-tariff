from django.urls import path 
from . import views

urlpatterns = [
  path('api/register/', views.UserRegistrationView.as_view(), name='register'),
  path('api/login/', views.UserLoginView.as_view(), name='login'),
  path('api/logout/', views.UserLogoutView.as_view(), name='logout'),
  path('api/tariff/', views.tariff, name='tariff'),
  path('api/utility_cost/', views.utility_cost_graph, name='utility_cost'),
  path('api/projects/', views.project_list, name='project_list'),
  path('api/protected/', views.ProtectedView.as_view(), name='protected'),
]