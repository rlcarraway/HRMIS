import { NextRequest, NextResponse } from 'next/server';
import { serverStorage } from '@/lib/serverStorage';
import { logConfigChange } from '@/lib/serverAuditLog';
import { authenticateApiRequest } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

// PUT /api/custom-attributes/[id] - Update custom attribute
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Only admins can update custom attributes
    const auth = await authenticateApiRequest(request, { requiredRole: 'admin' });
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const allAttributes = await serverStorage.getCustomAttributes();
    const oldAttribute = allAttributes.find(attr => attr.id === params.id);

    const updatedAttribute = await serverStorage.updateCustomAttribute(params.id, body);

    if (!updatedAttribute) {
      return NextResponse.json(
        { success: false, error: 'Custom attribute not found' },
        { status: 404 }
      );
    }

    // Log the attribute update
    await logConfigChange(
      'config.attribute.update',
      `Updated custom attribute: ${updatedAttribute.name}`,
      {
        userId: auth.user.email,
        userName: auth.user.name,
        userEmail: auth.user.email,
        success: true,
        oldValue: oldAttribute,
        newValue: updatedAttribute,
        details: {
          attributeId: updatedAttribute.id,
          attributeName: updatedAttribute.name,
          updatedFields: Object.keys(body),
          authType: auth.user.authType,
          clientId: auth.user.clientId,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: updatedAttribute,
    });
  } catch (error) {
    console.error('Error updating custom attribute:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating custom attribute' },
      { status: 500 }
    );
  }
}

// DELETE /api/custom-attributes/[id] - Delete custom attribute
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Only admins can delete custom attributes
    const auth = await authenticateApiRequest(request, { requiredRole: 'admin' });
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Admin access required' },
        { status: 403 }
      );
    }

    const allAttributes = await serverStorage.getCustomAttributes();
    const attribute = allAttributes.find(attr => attr.id === params.id);
    const success = await serverStorage.deleteCustomAttribute(params.id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Custom attribute not found' },
        { status: 404 }
      );
    }

    // Log the attribute deletion
    await logConfigChange(
      'config.attribute.delete',
      `Deleted custom attribute: ${attribute?.name || params.id}`,
      {
        userId: auth.user.email,
        userName: auth.user.name,
        userEmail: auth.user.email,
        success: true,
        details: {
          attributeId: params.id,
          attributeName: attribute?.name,
          dataType: attribute?.dataType,
          authType: auth.user.authType,
          clientId: auth.user.clientId,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Custom attribute deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting custom attribute:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while deleting custom attribute' },
      { status: 500 }
    );
  }
}
