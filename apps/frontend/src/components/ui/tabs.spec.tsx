import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

function TestTabs() {
  const [activeTab, setActiveTab] = useState('tab1');
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="tab1">Pestaña 1</TabsTrigger>
        <TabsTrigger value="tab2">Pestaña 2</TabsTrigger>
        <TabsTrigger value="tab3">Pestaña 3</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Contenido Panel 1</TabsContent>
      <TabsContent value="tab2">Contenido Panel 2</TabsContent>
      <TabsContent value="tab3">Contenido Panel 3</TabsContent>
    </Tabs>
  );
}

describe('Tabs component accessibility & interaction', () => {
  it('renders tablist and active panel with correct ARIA attributes', () => {
    render(<TestTabs />);

    const tab1 = screen.getByRole('tab', { name: 'Pestaña 1' });
    const tab2 = screen.getByRole('tab', { name: 'Pestaña 2' });

    expect(tab1).toHaveAttribute('aria-selected', 'true');
    expect(tab2).toHaveAttribute('aria-selected', 'false');

    expect(screen.getByRole('tabpanel')).toHaveTextContent('Contenido Panel 1');
  });

  it('switches active tab and panel on click', async () => {
    const user = userEvent.setup();
    render(<TestTabs />);

    const tab2 = screen.getByRole('tab', { name: 'Pestaña 2' });
    await user.click(tab2);

    expect(tab2).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Contenido Panel 2');
    expect(screen.queryByText('Contenido Panel 1')).not.toBeInTheDocument();
  });

  it('navigates tabs with ArrowRight, ArrowLeft, Home, and End keys', async () => {
    const user = userEvent.setup();
    render(<TestTabs />);

    const tab1 = screen.getByRole('tab', { name: 'Pestaña 1' });
    tab1.focus();

    // ArrowRight -> tab2
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Pestaña 2' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Contenido Panel 2');

    // End -> tab3
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Pestaña 3' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Contenido Panel 3');

    // Home -> tab1
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Pestaña 1' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Contenido Panel 1');

    // ArrowLeft -> loops to tab3
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Pestaña 3' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Contenido Panel 3');
  });
});
