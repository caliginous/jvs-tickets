import { useState } from 'react'
import { 
  Button, 
  Input, 
  Select, 
  Dialog, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter,
  showToast 
} from '../ui'

export default function UITest() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectValue, setSelectValue] = useState('')

  const selectOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">UI Component Test Page</h1>
        
        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button variant="solid">Solid Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="danger">Danger Button</Button>
              <Button variant="secondary">Secondary Button</Button>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">🚀</Button>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button loading>Loading Button</Button>
              <Button disabled>Disabled Button</Button>
            </div>
          </CardContent>
        </Card>

        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Basic Input" placeholder="Enter text..." />
            <Input 
              label="Input with Error" 
              placeholder="This has an error" 
              error="This field is required" 
            />
            <Input 
              label="Input with Helper Text" 
              placeholder="This has helper text" 
              helperText="This is helpful information" 
            />
            <Input 
              label="Input with Start Icon" 
              placeholder="Search..." 
              startAdornment="🔍" 
            />
            <Input 
              label="Input with End Icon" 
              placeholder="Enter amount" 
              endAdornment="💰" 
            />
          </CardContent>
        </Card>

        {/* Select */}
        <Card>
          <CardHeader>
            <CardTitle>Select</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              label="Choose an option"
              options={selectOptions}
              value={selectValue}
              onChange={setSelectValue}
              placeholder="Select an option..."
            />
          </CardContent>
        </Card>

        {/* Dialog */}
        <Card>
          <CardHeader>
            <CardTitle>Dialog</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setDialogOpen(true)}>Open Dialog</Button>
            
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} size="md">
              <Dialog.Header>
                <h3 className="text-lg font-semibold">Dialog Title</h3>
              </Dialog.Header>
              <Dialog.Body>
                <p>This is the dialog content. You can put any content here.</p>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setDialogOpen(false)}>
                  Confirm
                </Button>
              </Dialog.Footer>
            </Dialog>
          </CardContent>
        </Card>

        {/* Toast Test */}
        <Card>
          <CardHeader>
            <CardTitle>Toast Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => showToast.success('Success message!')}
              >
                Show Success Toast
              </Button>
              <Button 
                variant="outline" 
                onClick={() => showToast.error('Error message!')}
              >
                Show Error Toast
              </Button>
              <Button 
                variant="outline" 
                onClick={() => showToast.loading('Loading...')}
              >
                Show Loading Toast
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
