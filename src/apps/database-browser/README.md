# Database Browser App

A visual browser for exploring database entities in a column-based navigation interface.

## Features

- Column-based hierarchical entity browser
- Detail view for entity properties
- Live update via notifications
- Field editing capabilities
- Entity search functionality

## Components

### Main Components

- **DatabaseBrowserApp**: Root app component integrating all parts
- **ColumnBrowser**: Displays entity hierarchy in resizable columns
- **EntityDetailsPanel**: Shows detailed view of selected entity

### Helper Components

- **EntityColumn**: Individual column for entity navigation
- **ValueDisplay**: Displays entity field values with proper formatting
- **ValueEditor**: Provides editing interface for entity fields
- **LoadingIndicator**: Visual indicator during loading operations

## Usage

The Database Browser app is designed to connect to a data store and provide a visual interface for exploring entities in the database. It automatically connects to the data store when launched.

### Navigation

- Browse entity hierarchies using the column interface
- Click on entities to view their details
- Search for entities using the search input in each column
- Resize columns by dragging the dividers

### Entity Details

- View all fields for a selected entity
- Edit fields by clicking the edit button or double-clicking a value
- Observe real-time updates when fields are changed by other users

## Development

### Structure

