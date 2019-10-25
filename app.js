(function () {
  angular.module('tcs-fault-tolerance-system', []);
})();

(function (app) {
  app.controller('app-controller', config);

  config.$inject = ['$scope', '$window', '$http', '$timeout'];

  function config($scope, $window, $http, $timeout) {

    $scope.const = {
      maxFileLimit: 15,
      fileSizeLimit: 4000000,
      allowedFileExtensions: [
        'doc', 'docx', 'pdf',
        'jpg', 'jpeg', 'png'
      ],
      retryTimeoutLength: 5000
    };

    $scope.var = {
      selectedFiles: [],
      model: {}
    };


    $scope.state = {
      submitting: false,
      reconnecting: false,
      reuploading: false
    };

    $scope.event = {
      getFileDetails: getFileDetails,
      removeFile: removeFile,
      submit: submit
    };

    $scope.format = {
      fileSize: formatFileSize
    };

    // Globalise submit so recaptcha can submit after user validation
    $window.submit = $scope.event.submit;

    // Loading complete
    jQuery('.angular-initial-hide').fadeIn().removeClass('angular-initial-hide');

    function getFileDetails(element) {
      if ($scope.var.selectedFiles.length >= $scope.var.maxFileLimit)
        return;

      $scope.$apply(function () {
        let length = $scope.const.maxFileLimit - $scope.var.selectedFiles.length;
        length = length > element.files.length ? element.files.length : length;

        for (let i = 0; i < length; i++) {
          let fileInList = $scope.var.selectedFiles.find(x => x.name === element.files[i].name);

          if (fileInList === null || fileInList === undefined) {
            if (element.files[i].size > $scope.const.fileSizeLimit)
              alert(
                'File size limit exceeded: ' +
                element.files[i].name + ' exceeds the file size limit of ' + formatFileSize($scope.const.fileSizeLimit) + ' and has been discarded'
              );
            else
              $scope.const.allowedFileExtensions.forEach((allowedExtension) => {
                if (element.files[i].name.endsWith(allowedExtension)) {
                  $scope.var.selectedFiles.push(element.files[i]);
                  //console.log('New file added', element.files[i]);
                }
              })
          }
        }

        $(element).val('');
      });
    }

    function removeFile(file) {
      $scope.var.selectedFiles.splice($scope.var.selectedFiles.indexOf(file), 1);
    }

    function submit() {
      jQuery('.is-invalid').removeClass('is-invalid');
      jQuery('.is-valid').removeClass('is-valid');
      jQuery('.ng-invalid').addClass('is-invalid');
      jQuery('.ng-valid').addClass('is-valid');

      submitRequest();
    }

    function submitRequest() {
      let viewModel = Object.assign({}, $scope.var.model);

      viewModel.filesAmount = $scope.var.selectedFiles.length;

      console.log(viewModel);

      $scope.state.submitting = true;
      $scope.var.uploadSuccessCount = 0;

      $http.post('/submit', viewModel).then((response) => {
        $scope.state.submitting = false;

        if ($scope.var.selectedFiles.length == 0) {
          $scope.var.uploadSuccessCount = 0;
        }
        else {
          $timeout(function () {
            let submissionId = response.data;

            $scope.var.selectedFiles.forEach(function (file) {
              uploadFile(file, submissionId);
            });
          }, 2000);
        }
        console.log(response);
      }, (response) => {
        $scope.state.submitting = false;

        if (response.data == null) {
          alert('Submission failed: ' + 'Please check your internet connection and try again')
        }
        else {
          try {
            alert('Request failed: ' + response.data);
          }
          catch (e) {
            alert('Submission failed: ' + e.message);
            console.error(e.message);
          }
        }
        console.error(response);
      });
    }

    function uploadFile(file, submissionId) {
      let xhr = new XMLHttpRequest();
      let formData = new FormData();

      formData.append('file', file);
      file.progress = 0;

      xhr.upload.addEventListener('progress',
        (e) => {
          if (e.lengthComputable) {
            $scope.$apply(() => {
              file.progress = Math.round(e.loaded * 100 / e.total);;
            });
          }
        }, false);

      xhr.addEventListener('load',
        (response) => {
          $scope.$apply(() => {
            $scope.var.uploadSuccessCount++;
          });

          if ($scope.var.uploadSuccessCount >= $scope.var.selectedFiles.length) {
            console.log('Upload complete');
            $scope.state.reuploading = false;
          }
        }, false);

      xhr.open('POST', `/upload/${submissionId}`);
      xhr.onerror = () => {
        console.log('Upload failed');
        $scope.state.reconnecting = true;
        setTimeout(() => {
          $scope.state.reconnecting = false;
          $scope.state.reuploading = true;
          uploadFile(file, submissionId);
        }, $scope.const.retryTimeoutLength);
      };
      xhr.send(formData);
    }

    function formatFileSize(size) {
      let unit = '';

      if (size >= 1000000) {
        size = (size / 1000000).toFixed(2);
        unit = 'MB';
      }
      else {
        size = (size / 1000).toFixed(2);
        unit = 'KB';
      }

      return size + ' ' + unit;
    }
  }
})(angular.module('tcs-fault-tolerance-system'));
