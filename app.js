
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
		})
		.when('/account', {
			templateUrl: 'pages/account.html',
			controller: 'AccountController'
		})
		.when('/about', {
			templateUrl: 'pages/about.html',
			controller: 'AboutController'
		})
		.when('/privacy', {
			templateUrl: 'pages/privacy.html',
			controller: 'PrivacyController'
		})
		.when('/blog', {
			templateUrl: 'pages/blog.html',
			controller: 'BlogController'
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
app.filter('descending', function(){
	return function(scope, test){
		if(typeof scope == "undefined")
			return
		var totalCost = 0;
		for(var i = 0; i<scope.length; i++)
			totalCost += Number(scope[i].value);
		test.sum = totalCost.toFixed(2);
		return scope.slice().reverse();
	};
});

app.controller('AuthController', function($scope, $rootScope, Auth){
	$scope.auth = Auth;
	$scope.user = 0;
	$scope.auth.$onAuth(function(authData){
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


app.controller('MoneyTrackerController', function($scope, $rootScope, $firebaseObject, $firebaseArray){
	var ref = new Firebase('https://walletrak.firebaseio.com/');
	var userRef = ref.child($rootScope.uid);
	var userObject = $firebaseObject(userRef);

	var tabRef = userRef.child('tabs');
	$scope.tabs = $firebaseArray(tabRef);
	
	userObject.$loaded().then(function(){
		if(!userObject.setup){
			$scope.tabs.$add({name:'Default', data:[]}).then(function(ref){
				var id = ref.key();
				$scope.currentTab = tabRef.child(id);
				$scope.tabBind = $firebaseObject($scope.currentTab);
				$scope.tabBind.$bindTo($scope, "tabObject");
				$scope.currentRef = $scope.currentTab.child('data');
				$scope.entries = $firebaseArray($scope.currentRef);

				userObject.setup = true;
				userObject.$save();
			})
			
		} else {
			$scope.currentTab = tabRef.child($scope.tabs.$keyAt(0));
			$scope.tabBind = $firebaseObject($scope.currentTab);
			$scope.tabBind.$bindTo($scope, "tabObject");
			$scope.currentRef = $scope.currentTab.child('data');
			$scope.entries = $firebaseArray($scope.currentRef);
		}

	})
	

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
		$scope.currentTab = tabRef.child(i.$id);
		$scope.tabBind.$destroy();
		$scope.tabBind = $firebaseObject($scope.currentTab);
		$scope.tabBind.$bindTo($scope, "tabObject");
		$scope.currentRef = $scope.currentTab.child('data');
		$scope.entries = $firebaseArray($scope.currentRef);
	}
	$scope.removeTab = function(){
		if(confirm("Are you sure you want to delete this tab?")){
			var removeIndex = $scope.tabs.$indexFor($scope.currentTab.key());
			$scope.tabBind.$destroy();
			$scope.tabs.$remove(removeIndex);
			$scope.currentTab = tabRef.child($scope.tabs.$keyAt(0));
			$scope.tabBind = $firebaseObject($scope.currentTab);
			$scope.tabBind.$bindTo($scope, "tabObject");
			$scope.currentRef = $scope.currentTab.child('data');
			$scope.entries = $firebaseArray($scope.currentRef);
		}
	}
	$scope.addTab = function(){
		if($scope.addingTab){
			$scope.tabs.$add({name:$scope.newTabName, data:[]}).then(function(ref){
				var id = ref.key();
				$scope.currentTab = tabRef.child(id);
				$scope.tabBind.$destroy();
				$scope.tabBind = $firebaseObject($scope.currentTab);
				$scope.tabBind.$bindTo($scope, "tabObject");
				$scope.currentRef = $scope.currentTab.child('data');
				$scope.entries = $firebaseArray($scope.currentRef);
				$scope.addingTab = 0;
				$scope.newTabName = "";
			})
		}
		else{
			$scope.addingTab = 1;
		}
	}
});

app.controller('AccountController', function($scope, $rootScope, $firebaseObject, $firebaseArray, $http){
	var ref = new Firebase('https://walletrak.firebaseio.com/');
	var userRef = ref.child($rootScope.uid);
	var userObject = $firebaseObject(userRef);
	var settingsRef = userRef.child('settings');
	$scope.settings = $firebaseObject(settingsRef);

	$scope.saveSettings = function(){
		if(!$scope.settings.analytics){
			$scope.settings.zipcode = "";
			$scope.settings.income = "";
			$scope.settings.state = "";
			$scope.settings.city = "";
		}
		if($scope.settings.zipcode){
			$http.get('http://maps.googleapis.com/maps/api/geocode/json?address='+'61821').then(function(response){
				$scope.settings.city=response.data.results[0].address_components[1].short_name;
				$scope.settings.state=response.data.results[0].address_components[3].short_name;
				console.log($scope.settings.city);
				console.log($scope.settings.state)
				$scope.settings.$save();
			});
		}
		else
			$scope.settings.$save();
		alert("Settings Saved!");
	}
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