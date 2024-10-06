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
    api_url = f"https://api.openei.org/utility_rates?version=latest&address={address}&approved=true&format=json&api_key={api_key}"
    response = requests.get(api_url)
    return response.json()

@csrf_exempt
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
            selected_tariff = request.POST.get('selected_tariff')
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
                'cost_first_year': kwh * selected_tariff['rate'] / 100,  # Convert cents to dollars
            }
            
            project = Project.objects.create(
                user=request.user,
                address=address,
                kwh=kwh,
                escalator=escalator,
                selected_tariff=selected_tariff['name'],
                cost_first_year=context['cost_first_year']
            )

            ProposalUtility.objects.create(
                project=project,
                openei_id=selected_tariff.get('id', ''),
                tariff_name=selected_tariff['name'],
                pricing_matrix=selected_tariff.get('energyratestructure', []),
                utility_name=selected_tariff['utility'],
                rate_structure=selected_tariff.get('energyratestructure', [])
            )

            return JsonResponse(context)

    return JsonResponse({"error": "No utility rates found for the given address."}, status=400)


def project_list(request):
    projects = Project.objects.filter(user=request.user).order_by('-created_at')
    return JsonResponse(projects)

