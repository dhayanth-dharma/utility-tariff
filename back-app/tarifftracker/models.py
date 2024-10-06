from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

# Create your models here.
class Tariff(models.Model):
    name = models.CharField(max_length=100)
    rate_per_kWh = models.FloatField()
    start_date = models.DateField()
    approved = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    address = models.CharField(max_length=255)
    utility = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.name} - {self.utility}"

class Project(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    address = models.CharField(max_length=255)
    kwh = models.IntegerField()
    escalator = models.FloatField()
    selected_tariff = models.CharField(max_length=255)
    cost_first_year = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.user.username}'s project at {self.address}"

class ProposalUtility(models.Model):
    project = models.OneToOneField(Project, on_delete=models.CASCADE)
    openei_id = models.CharField(max_length=255)
    tariff_name = models.CharField(max_length=255)
    pricing_matrix = models.JSONField()
    utility_name = models.CharField(max_length=255)
    rate_structure = models.JSONField()

    def __str__(self):
        return f"Utility proposal for {self.project}"