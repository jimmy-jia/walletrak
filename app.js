
var app = angular.module('appMain', ["firebase", "ngRoute"]);

app.config(function($routeProvider, $locationProvider){
	$routeProvider
		.when('/', {
			templateUrl: 'pages/home.html'
		})
		.when('/login', {
			templateUrl: 'pages/login.html',
			controller: 'AuthController'
		})
		.when('/dashboard', {
			templateUrl: 'pages/dashboard.html',
			controller: 'MoneyTrackerController'
		});
		$locationProvider.html5Mode(true);
});
app.run(function($rootScope, Auth){
	Auth.$onAuth(function(authData){
		try{
			$rootScope.uid = authData.uid;
		} catch(err) {
			$rootScope.uid = 0;
		}
	});
	$rootScope.logout = function(){
		Auth.$unauth();
	}
})

app.factory('Auth', function($firebaseAuth){
	var ref = new Firebase('https://walletrak.firebaseio.com/');
	return $firebaseAuth(ref);
})
app.controller('AuthController', function($scope, $rootScope, Auth){
	$scope.auth = Auth;
	$scope.user = 0;
	$scope.auth.$onAuth(function(authData){
		console.log(authData);
		try{
			$rootScope.uid = authData.uid;
			$scope.user = authData.uid;
		} catch(err) {
			$rootScope.uid = 0;
			$scope.user = 0;
		}
	});
	$scope.signIn = function(){
		$scope.auth.$authWithPassword({
			email: $scope.email,
			password: $scope.password
		}).then(function(userData){
			$scope.message = "Logged In!";
		}).catch(function(err){
			$scope.message = err;
		});
	}
	$scope.signUp = function(){
		$scope.message = "";
		$scope.auth.$createUser({
			email: $scope.email, 
			password: $scope.password
		}).then(function(userData){
			$scope.message = "Account Created!";
			$scope.signIn();
		}).catch(function(err){
			$scope.message = err;
		});
	}
	$scope.logout = function(){
		$scope.auth.$unauth();
		$scope.message = "Logged Out!"
		$scope.user = 0;
	}
});


app.controller('MoneyTrackerController', function($scope, $rootScope, $firebaseArray){
	var ref = new Firebase('https://walletrak.firebaseio.com/');
	var userRef = ref.child($rootScope.uid);

	$scope.tabs = $firebaseArray(userRef);
	var currentRef = userRef.child('Default');
	$scope.currentTab = 'Default';
	$scope.entries = $firebaseArray(currentRef);
	$scope.addEntry = function(){
		var cost = Number($scope.entryValue).toFixed(2);
		$scope.entries.$add({date:getCurrentDate(), text:$scope.entryName, value:cost});
		$scope.entryName = "";
		$scope.entryValue = "";
	};
	$scope.removeEntry = function(id){
		$scope.entries.$remove(id);
	}
	$scope.changeTab = function(i){
		currentRef = userRef.child(i.$id);
		$scope.currentTab = i.$id;
		$scope.entries = $firebaseArray(currentRef);
	}
	$scope.removeTab = function(){
		if(confirm("Are you sure you want to delete this tab?")){
			var removeIndex = $scope.tabs.$indexFor($scope.currentTab);
			$scope.tabs.$remove(removeIndex);
			currentRef = userRef.child('Default');
			$scope.currentTab = 'Default';
			$scope.entries = $firebaseArray(currentRef);
		}
	}
	$scope.addTab = function(){
		if($scope.addingTab){
		currentRef = userRef.child($scope.newTabName);
		$scope.entries = $firebaseArray(currentRef);
		$scope.addingTab = 0;
		}
		else{
			$scope.addingTab = 1;
		}
	}
});

app.filter('descending', function(){
	return function(scope, test){
		var totalCost = 0;
		for(var i = 0; i<scope.length; i++)
			totalCost += Number(scope[i].value);
		test.sum = totalCost.toFixed(2);
		return scope.slice().reverse();
	};
});


var getCurrentDate = function(){
	var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth()+1;
	var yyyy = today.getFullYear();
	if(dd<10){
		dd = "0" + dd;
	}
	if(mm<10){
		mm = "0" + mm;
	}
	return mm+'/'+dd+'/'+yyyy;
}