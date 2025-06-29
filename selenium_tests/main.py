from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import unittest


# # Get python command arguments:
# parser = argparse.ArgumentParser(description='Selenium end to end tests.')
# parser.add_argument('--local', action="store", dest='local', default=0) # if --local 1 argument is passed to the python command then execute test as in local mode 
#                                                                         # which test localhost:IP_ADRESS browser.
# args = parser.parse_args()


# # Define environment:
# host = "localhost:3000" if int(args.local) else "" # The adress to be defined in the else clause.


# Testing class
class FrontendEndToEndTests(unittest.TestCase):

   def setUp(self):
      self.driver = webdriver.Remote(
         command_executor='http://selenium__standalone-chrome:4444',
         options=webdriver.ChromeOptions()
      )


   def test_login_page(self):
      driver = self.driver
      driver.get("https://YOUR_PROJECT_ID.uw.r.appspot.com/")
      elem = driver.find_element(By.NAME, "gsi-material-button")
      elem.send_keys("123456", Keys.ARROW_DOWN)
      assert "No results found." not in driver.page_source

   def tearDown(self):
      self.driver.close()

if __name__ == '__main__':
    unittest.main()