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
      reuploading: false,
      verifyingFiles: false,
      reconnecting: false
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
                element.files[i].name + ' exceeds the file size limit of ' + formatFileSize($scope.const.fileSizeLimit) + ' and has been discarded',
                () => {}
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
      let index = $scope.var.selectedFiles.indexOf(file);

      $scope.var.selectedFiles.splice(index, 1);
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
      $scope.var.uploadTrackingNumber = null;

      $http.post('/submit', viewModel).then(function (response) {
        if ($scope.var.selectedFiles.length === 0) {
          $scope.var.uploadTrackingNumber = 0;
        }
        else {
          $timeout(function () {
            let submissionId = response.data;
            $scope.var.uploadTrackingNumber = 0;

            $scope.var.selectedFiles.forEach(function (file) {
              uploadSingleFile(file, submissionId);
            });
          }, 2000);
        }
        console.log(response);
      }, function (response) {
        $scope.state.submitting = false;

        if (response.data == null) {
          alert('Submission failed: ' + 'Please check your internet connection and try again')
        }
        else {
          try {
            alert('Form invalid: ' + response.data);
          }
          catch (e) {
            alert('Submission failed: ' + e.message);
            console.error(e.message);
          }
        }

        console.error(response);
      });
    }

    function uploadSingleFile(file, submissionId) {
      let formData = new FormData();
      formData.append('file', file);
      file.progress = 0;

      let reqObj = new XMLHttpRequest();

      reqObj.upload.addEventListener('progress', function (e) {
        if (e.lengthComputable) {
          let uploadProgressCount = Math.round(e.loaded * 100 / e.total);

          $scope.$apply(() => {
            file.progress = uploadProgressCount;
          });
        }
      }, false);

      reqObj.addEventListener('load', function (response) {
        $scope.$apply(() => {
          $scope.var.uploadTrackingNumber++;
        });

        if ($scope.var.uploadTrackingNumber >= $scope.var.selectedFiles.length) {
          console.log('Upload complete');
          //verifyFiles(submissionId, true);
        }
      }, false);

      reqObj.open('POST', `/upload/${submissionId}`);
      reqObj.onerror = () => {
        /*if (!$scope.state.verifyingFiles)
  verifyFiles(submissionId);*/
      };
      reqObj.send(formData);
    }

    function verifyFiles(submissionId, uploadFinished) {
      $scope.state.verifyingFiles = true;
      $scope.state.reuploading = false;

      $http.post('/verifyfiles', '"' + submissionId + '"').then((response) => {
        $scope.state.reconnecting = false;
        $scope.state.reuploading = false;
        $scope.state.verifyingFiles = false;
        console.info('Files successfully uploaded');
        //console.log(response);
      }, (response) => {
        if (response.data == null) {
          $scope.state.reconnecting = true;
          $scope.state.reuploading = false;
          console.warn('Internet connection interrupted, attempting to reconnect...');
          setTimeout(() => {
            verifyFiles(submissionId);
          }, $scope.const.retryTimeoutLength);
        }
        else {
          console.error('Upload verification failed');
          try {
            if (response.data == 'Retry limit exceeded') {
              $scope.state.reuploading = false;
              $scope.state.submitting = false;
              alert('Submission failed: ' + response.data);
            }
            else {
              $scope.var.selectedFiles.forEach((file) => {
                if (response.data.indexOf(file.name) < 0) {
                  $scope.state.reconnecting = false;
                  $scope.state.reuploading = true;
                  if (uploadFinished) {
                    $scope.var.uploadTrackingNumber--;
                  }
                  console.log('Attempting to reupload', file.name);
                  setTimeout(
                    uploadSingleFile(file, submissionId),
                    $scope.const.retryTimeoutLength
                  );
                }
              });
            }
          }
          catch (e) {
            $scope.state.reuploading = false;
            $scope.state.submitting = false;
            alert('Error: ' + e.message);
            console.error(e.message);
          }
          $scope.state.verifyingFiles = false;
        }
        console.error(response);
      });
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

    function tryFunction(f) {
      try {
        return f();
      }
      catch (e) {
        console.error(e.message);
        return null;
      }
    }

    function isEmpty(variable) {
      try {
        if (typeof variable === 'undefined' || variable == null || variable == '')
          return true
        else
          return false
      }
      catch (e) {
        console.error(e.message);
        return true;
      }
    }
  }
})(angular.module('tcs-fault-tolerance-system'));
