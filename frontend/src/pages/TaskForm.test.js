import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import TaskForm from './TaskForm';
import { TasksContextProvider } from '../context/TasksContext';
import { AuthContextProvider } from '../context/AuthContext';
import { BrowserRouter as Router } from 'react-router-dom';
import '@testing-library/jest-dom';
import moment from 'moment-timezone';

jest.mock('../hooks/useCustomFetch', () => ({
  useCustomFetch: jest.fn().mockImplementation(() => {
    return (url, method = 'GET', data = null) => {
      return new Promise((resolve, reject) => {
        if (method === 'POST' && url === '/api/tasks') {
          if (!data.title || !data.date || !data.description || !data.priority) {
            // Combine errors into a single message string
            const errors = [];
            if (!data.title) errors.push("The title field is required.");
            if (!data.date) errors.push("Please provide a due date for the task.");
            if (!data.description) errors.push("A task description is required.");
            if (!data.priority) errors.push("Please select a priority level for the task.");
            reject(new Error(errors.join(' ')));  // Combining errors into one string
          } else {
            resolve({ message: 'Task Created' });
          }
        } else {
          resolve({});  // Default resolve for other cases
        }
      });
    };
  })
}));

//setup function provides all neccessary context providers
const setup = () => render(
  <Router>
    <AuthContextProvider>
      <TasksContextProvider>
        <TaskForm />
      </TasksContextProvider>
    </AuthContextProvider>
  </Router>
);

// Helper function to fill in the form
const fillForm = async (getByLabelText, getByRole, { title = '', date = '', description = '', priority = '' }) => {
  const titleInput = getByLabelText('Task Title:');
  const dateInput = getByLabelText('Due Date:');
  const descriptionInput = getByLabelText('Description:');
  const prioritySelect = getByLabelText('Priority:');
  const submitButton = getByRole('button', { name: /submit/i });

  await act(async () => {
    fireEvent.change(titleInput, { target: { value: title } });
    fireEvent.change(dateInput, { target: { value: date } });
    fireEvent.change(descriptionInput, { target: { value: description } });
    fireEvent.change(prioritySelect, { target: { value: priority } });
    fireEvent.click(submitButton);
  });
};

// Define a constant for the combined error message
const combinedErrorMessage = "The title field is required. Please provide a due date for the task. " + 
"A task description is required. Please select a priority level for the task.";

/* The test checks if TaskForm can handle and display errors when the API (as simulated by the mock) 
indicates that required fields are missing. By simulating an error response from the API when required fields are missing, 
the test indirectly checks whether the form validates input fields and correctly handles error states. 
The presence of the console error in the output is part of the expected behavior when the mocked fetch
function rejects the submission due to validation failures.
*/
describe('TaskForm', () => {
  test('fails to create task when required fields are missing', async () => {
    const { getByLabelText, getByRole, findByText } = setup();

    // Use fillForm helper to submit an empty form
    await fillForm(getByLabelText, getByRole, {
      title: '',
      date: '',
      description: '',
      priority: ''
    });

    // Check for the combined error message
    expect(await findByText(combinedErrorMessage)).toBeInTheDocument();
  });
});

describe('TaskForm Frontend Validation', () => {
  test('shows combined error when required fields are empty', async () => {
    const { getByLabelText, getByRole, findByText } = setup();

    // Use fillForm helper to submit an empty form
    await fillForm(getByLabelText, getByRole, {
      title: '',
      date: '',
      description: '',
      priority: ''
    });

    // Check for the combined error message
    expect(await findByText(combinedErrorMessage)).toBeInTheDocument();
  });

  // Additional tests??
});

describe('TaskForm API Interaction', () => {
  test('submits the form successfully and displays a success message', async () => {
    const { getByLabelText, getByRole, findByText } = setup();
    const testDate = moment().tz('America/Los_Angeles').add(1, 'days').format('YYYY-MM-DDTHH:mm');

    // Use fillForm helper to fill in the form with valid data
    await fillForm(getByLabelText, getByRole, {
      title: 'New Task',
      date: testDate,
      description: 'Complete this task soon.',
      priority: 'High'
    });

    // Expect to find a success message
    expect(await findByText('Task Created')).toBeInTheDocument();
  });  

  test('fails to create task when required fields are missing and displays combined error messages', async () => {
    const { getByLabelText, getByRole, findByText } = setup();

    // Use fillForm helper to submit an empty form
    await fillForm(getByLabelText, getByRole, {
      title: '',
      date: '',
      description: '',
      priority: ''
    });

    // Check for combined error messages
    expect(await findByText(combinedErrorMessage)).toBeInTheDocument();
  });

  // Additional tests??
});

describe('TaskForm - Fetch Employees', () => {
  test('displays fetched employees in dropdown menu', async () => {
    // Mock the API response with sample list of employees
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { 
          _id: '1', 
          fname: 'John', 
          lname: 'Doe', 
          email: 'john.doe@example.com',
          password: 'password123',
          role: 'employee',
          verified: true,
          owner: false
        },
        { 
          _id: '2', 
          fname: 'Jane', 
          lname: 'Smith', 
          email: 'jane.smith@example.com',
          password: 'password456',
          role: 'admin',
          verified: true,
          owner: false
        },
        // Add more employee records as needed
      ]),
    });
  
    // Render the TaskForm component using the setup function
    const { getByLabelText } = setup();
  
    // Wait for the component to render and fetch employees
    await waitFor(() => expect(getByLabelText(/assign employee/i)).toBeInTheDocument());
  
    // Get the dropdown menu element
    const employeeDropdown = getByLabelText(/assign employee/i);
  
    // Extract options from the dropdown menu
    const options = Array.from(employeeDropdown.options);

    console.log('Dropdown options:', options);
  
    // Assert that the dropdown menu contains the expected number of options
    expect(options).toHaveLength(3); // Including the default option and two employees
  
    // Assert that each option corresponds to an employee fetched from the server
    expect(options[0].text).toBe('Select Employee');
    expect(options[1].text).toBe('John Doe');
    expect(options[2].text).toBe('Jane Smith');
  });  
});


