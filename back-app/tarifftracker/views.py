from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.contrib.auth.decorators import login_required
import requests
from datetime import datetime
import random
from .models import Project, ProposalUtility
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, status
from rest_framework.response import Response
from .serializers import UserRegistrationSerializer, UserLoginSerializer
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
import json

class ProtectedView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response({"message": f"Hello, {request.user.username}! This is a protected view."})


class UserRegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserRegistrationSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                "token": token.key,
                "user": {
                    "username": user.username,
                    "email": user.email
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserLoginView(APIView):
    permission_classes = (AllowAny,)
    
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                "token": token.key,
                "user": {
                    "username": user.username,
                    "email": user.email
                }
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserLogoutView(APIView):
    permission_classes = (AllowAny,)  # Alternatively, use IsAuthenticated
    
    def post(self, request):
        # To logout, we can delete the token
        try:
            token = Token.objects.get(user=request.user)
            token.delete()
            return Response(status=status.HTTP_200_OK)
        except Token.DoesNotExist:
            return Response(status=status.HTTP_400_BAD_REQUEST)

def get_tariff_data(address):
    api_key = "cftiXJ0ooQD6Jm9OP1XWPwL3CMf5lreZHaGBAp7H"
    api_url = f"https://api.openei.org/utility_rates?version=latest&address={address}&detail=full&approved=true&format=json&api_key={api_key}"
    response = requests.get(api_url)
    return response.json()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tariff(request):
    data = json.loads(request.body)

    address = data.get('address', random.choice([
        '789 Pine Road, Denver, CO 80203',
        '321 Birch Lane, Seattle, WA 98101',
        '654 Cedar Boulevard, Miami, FL 33101',
        '987 Elm Street, Chicago, IL 60601'
    ]))
    kwh = int(data.get('kWh_consumption', 1000))
    escalator = float(data.get('escalator', 4)) / 100

    tariff_data = get_tariff_data(address)

    if tariff_data.get('items'):
        tariffs = []
        most_likely_tariff = None
        for item in tariff_data['items']:
            start_date = datetime.fromtimestamp(item.get('startdate', 0)).date()
            if start_date.year > 2021:
                # Calculate average rate across all periods
                energy_rate_structure = item.get('energyratestructure', [[{'rate': 0}]])
                total_rate = sum(period[0].get('rate', 0) for period in energy_rate_structure)
                avg_rate = total_rate / len(energy_rate_structure)
                
                tariff = {
                    'name': item.get('name', 'Unknown'),
                    'rate': avg_rate,
                    'start_date': start_date,
                    'utility': item.get('utility', 'Unknown'),
                }
                tariffs.append(tariff)
                
                if item.get('approved') and item.get('is_default'):
                    most_likely_tariff = tariff

        if tariffs:
            selected_tariff = data.get('selected_tariff')
            if selected_tariff:
                selected_tariff = next((t for t in tariffs if t['name'] == selected_tariff), most_likely_tariff)
            else:
                selected_tariff = most_likely_tariff or tariffs[0]

            context = {
                'address': address,
                'kwh': kwh,
                'escalator': escalator * 100,
                'selected_tariff': selected_tariff,
                'tariffs': tariffs,
                'cost_first_year': kwh * selected_tariff['rate'] / 100,  # Convert cents to dollars. selected_tariff_rate is average per kWh
            }
            
            project = Project.objects.create(
                user=request.user,
                address=address,
                kwh=kwh,
                escalator=escalator,
                selected_tariff=selected_tariff['name'],
                cost_first_year=context['cost_first_year']
            )

            # Send webhook notification
            send_webhook_notification(request, project)

            ProposalUtility.objects.create(
                project=project,
                openei_id=selected_tariff.get('id', ''),
                tariff_name=selected_tariff['name'],
                pricing_matrix=selected_tariff.get('energyratestructure', []),
                utility_name=selected_tariff['utility'],
                rate_structure=selected_tariff.get('energyratestructure', [])
            )

            return Response(context, status=status.HTTP_200_OK)

    return Response({"error": "No utility rates found for the given address."}, status=status.HTTP_400_BAD_REQUEST)


def project_list(request):
    projects = Project.objects.filter(user=request.user).order_by('-created_at')
    return JsonResponse(projects)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def utility_cost_graph(request):
    data = request.data
    kwh_consumption = data.get('kWh_consumption', 1000)
    average_rate = data.get('average_rate', 5.0)  # in ¢/kWh
    escalator = data.get('escalator', 0.04)  # as a decimal (4%)

    # Calculate utility costs over 20 years
    utility_costs = calculate_utility_costs(kwh_consumption, average_rate, escalator)

    return Response({'utility_costs': utility_costs}, status=status.HTTP_200_OK)



def calculate_utility_costs(kwh_consumption, average_rate, escalator, years=20):
    """
    Calculate the projected utility costs over a specified number of years.

    Parameters:
    - kwh_consumption: The annual electricity consumption in kWh.
    - average_rate: The average rate in ¢/kWh.
    - escalator: The annual increase in rates as a decimal (e.g., 0.04 for 4%).
    - years: The number of years to project costs for (default is 20).

    Returns:
    - A list of projected utility costs for each year.
    """
    # Convert average rate from ¢/kWh to $/kWh
    average_rate_dollars = average_rate / 100  # Convert cents to dollars
    
    yearly_costs = []  # List to hold the cost for each year

    for year in range(years):
        # Calculate the cost for the current year
        cost = kwh_consumption * average_rate_dollars
        yearly_costs.append(cost)
        
        # Increase the average rate by the escalator percentage for the next year
        average_rate_dollars *= (1 + escalator)

    return yearly_costs

def send_webhook_notification(request, project):
    # Prepare webhook notification
    webhook_url = "https://webhook.site/#!/abad1e6f-3d72-4ead-9f06-e9a519d8b4c9"
    webhook_payload = {
        "event": "project_created",
        "project_id": project.id,
        "user": request.user.username,
    }
        # Send the webhook notification
    try:
        requests.post(webhook_url, json=webhook_payload)
        print("Webhook notification sent")
    except requests.exceptions.RequestException as e:
        # Handle the exception (e.g., log it)
        print(f"Webhook notification failed: {e}")

